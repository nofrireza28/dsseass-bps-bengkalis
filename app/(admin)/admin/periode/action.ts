"use server";

import { db } from "@/db";
import { evaluationPeriods, employees, periodParticipants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { isDuplicatePeriod } from "@/lib/period-helpers";
import { PERIOD_TYPES, type PeriodType } from "@/lib/period-constants";
import {
  validatePreOpen,
  validatePreClose,
} from "@/lib/period-validation-helpers";
import { generateMatrixForPeriod } from "@/lib/matrix-generator";
import { auth } from "@/auth";

const periodSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(255),
  periodType: z.enum(PERIOD_TYPES),
  year: z.number().int().min(2020).max(2100),
  periodIndex: z.number().int().nullable(),
  description: z.string(),
  startDate: z.string().min(1, "Tanggal mulai wajib"),
  endDate: z.string().min(1, "Tanggal akhir wajib"),
});

export type PeriodActionState = {
  success: boolean;
  error?: string;
  periodId?: string;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  periodType: "Tipe periode",
  year: "Tahun",
  periodIndex: "Index periode",
  description: "Deskripsi",
  startDate: "Tanggal mulai",
  endDate: "Tanggal akhir",
};

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Input tidak valid";

  const fieldName = String(issue.path[0] ?? "");
  const label = FIELD_LABELS[fieldName] ?? fieldName;
  return label ? `${label}: ${issue.message}` : issue.message;
}

type ExistingPeriod = {
  name: string;
  periodType: string;
  year: number;
  periodIndex: number | null;
  description: string | null;
  startDate: string;
  endDate: string;
};

function parseFormData(formData: FormData, existing?: ExistingPeriod) {
  const periodType = String(
    formData.get("periodType") ?? existing?.periodType ?? "QUARTERLY",
  ) as PeriodType;

  const periodIndexRaw = formData.get("periodIndex");
  const periodIndex =
    periodIndexRaw && periodIndexRaw !== ""
      ? parseInt(String(periodIndexRaw))
      : null;

  return {
    name: String(formData.get("name") ?? existing?.name ?? ""),
    periodType,
    year: parseInt(
      String(
        formData.get("year") ?? existing?.year ?? new Date().getFullYear(),
      ),
    ),
    periodIndex,
    description: String(
      formData.get("description") ?? existing?.description ?? "",
    ),
    startDate: String(formData.get("startDate") ?? existing?.startDate ?? ""),
    endDate: String(formData.get("endDate") ?? existing?.endDate ?? ""),
  };
}

function validatePeriodIndex(
  periodType: PeriodType,
  periodIndex: number | null,
): string | null {
  if (
    periodType === "MONTHLY" &&
    (!periodIndex || periodIndex < 1 || periodIndex > 12)
  ) {
    return "Bulan harus 1-12 untuk tipe Bulanan";
  }
  if (
    periodType === "QUARTERLY" &&
    (!periodIndex || periodIndex < 1 || periodIndex > 4)
  ) {
    return "Triwulan harus 1-4 untuk tipe Triwulanan";
  }
  if (
    periodType === "SEMESTER" &&
    (!periodIndex || periodIndex < 1 || periodIndex > 2)
  ) {
    return "Semester harus 1-2 untuk tipe Semesteran";
  }
  if (periodType === "ANNUAL" && periodIndex !== null) {
    return "Tipe Tahunan tidak memerlukan index periode";
  }
  return null;
}

// ============== CREATE ==============

export async function createPeriodAction(
  formData: FormData,
): Promise<PeriodActionState> {
  const session = await requireRole(["ADMIN"]);

  const rawData = parseFormData(formData);

  const parsed = periodSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  if (new Date(parsed.data.endDate) < new Date(parsed.data.startDate)) {
    return {
      success: false,
      error: "Tanggal akhir harus setelah tanggal mulai",
    };
  }

  const errMsg = validatePeriodIndex(
    parsed.data.periodType,
    parsed.data.periodIndex,
  );
  if (errMsg) return { success: false, error: errMsg };

  const isDup = await isDuplicatePeriod(
    parsed.data.periodType,
    parsed.data.year,
    parsed.data.periodIndex,
  );
  if (isDup) {
    return {
      success: false,
      error: "Periode dengan tipe, tahun, dan index yang sama sudah ada",
    };
  }

  // Cari employee terkait user yang login (untuk createdBy audit)
  const adminEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });

  // Auto-populate flag (kalau admin centang di form)
  const addAllActive = formData.get("addAllActiveEmployees") === "true";

  try {
    const [newPeriod] = await db
      .insert(evaluationPeriods)
      .values({
        name: parsed.data.name,
        periodType: parsed.data.periodType,
        year: parsed.data.year,
        periodIndex: parsed.data.periodIndex,
        description: parsed.data.description || null,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        status: "DRAFT",
        createdBy: adminEmployee?.id ?? null,
      })
      .returning({ id: evaluationPeriods.id });

    // Auto-populate paratisipan kalau diminta
    if (addAllActive) {
      const allActive = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.status, "ACTIVE"));

      if (allActive.length > 0) {
        await db.insert(periodParticipants).values(
          allActive.map((e) => ({
            periodId: newPeriod.id,
            employeeId: e.id,
            isEvaluator: true,
            isEvaluatee: true,
          })),
        );
      }
    }

    revalidatePath("/admin/periode");
    return { success: true, periodId: newPeriod.id };
  } catch (error) {
    console.error("Failed to create period:", error);
    return { success: false, error: "Gagal membuat periode" };
  }
}

// ============== UPDATE (hanya DRAFT) ==============

export async function updatePeriodAction(
  periodId: string,
  formData: FormData,
): Promise<PeriodActionState> {
  await requireRole(["ADMIN"]);

  const existing = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });

  if (!existing) {
    return { success: false, error: "Periode tidak ditemukan" };
  }

  if (existing.status !== "DRAFT") {
    return {
      success: false,
      error: `Periode dengan status ${existing.status} tidak dapat diubah. Hanya periode DRAFT yang dapat diedit.`,
    };
  }

  const rawData = parseFormData(formData, existing);

  const parsed = periodSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  if (new Date(parsed.data.endDate) < new Date(parsed.data.startDate)) {
    return {
      success: false,
      error: "Tanggal akhir harus setelah tanggal mulai",
    };
  }

  const errMsg = validatePeriodIndex(
    parsed.data.periodType,
    parsed.data.periodIndex,
  );
  if (errMsg) return { success: false, error: errMsg };

  const isDup = await isDuplicatePeriod(
    parsed.data.periodType,
    parsed.data.year,
    parsed.data.periodIndex,
    periodId,
  );
  if (isDup) {
    return {
      success: false,
      error: "Periode dengan tipe, tahun, dan index yang sama sudah ada",
    };
  }

  try {
    await db
      .update(evaluationPeriods)
      .set({
        name: parsed.data.name,
        periodType: parsed.data.periodType,
        year: parsed.data.year,
        periodIndex: parsed.data.periodIndex,
        description: parsed.data.description || null,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        updatedAt: new Date(),
      })
      .where(eq(evaluationPeriods.id, periodId));

    revalidatePath("/admin/periode");
    revalidatePath(`/admin/periode/${periodId}`);
    return { success: true, periodId };
  } catch (error) {
    console.error("Failed to update period:", error);
    return { success: false, error: "Gagal memperbarui periode" };
  }
}

// ============== DELETE (hanya DRAFT) ==============

export async function deletePeriodAction(
  periodId: string,
): Promise<PeriodActionState> {
  await requireRole(["ADMIN"]);

  const existing = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });

  if (!existing) {
    return { success: false, error: "Periode tidak ditemukan" };
  }

  if (existing.status !== "DRAFT") {
    return {
      success: false,
      error: `Periode dengan status ${existing.status} tidak dapat dihapus. Hanya periode DRAFT yang dapat dihapus.`,
    };
  }

  try {
    await db
      .delete(evaluationPeriods)
      .where(eq(evaluationPeriods.id, periodId));
    revalidatePath("/admin/periode");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete period:", error);
    return { success: false, error: "Gagal menghapus periode" };
  }
}

// ============== OPEN PERIODE (DRAFT → OPEN) ==============

export async function openPeriodAction(
  periodId: string,
): Promise<PeriodActionState> {
  const session = await requireRole(["ADMIN"]);

  // 1. Verify periode masih DRAFT
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) {
    return { success: false, error: "Periode tidak ditemukan" };
  }
  if (period.status !== "DRAFT") {
    return {
      success: false,
      error: `Periode berstatus ${period.status}, hanya periode DRAFT yang dapat dibuka`,
    };
  }

  // 2. Re-validate (defense in depth — UI sudah validasi, tapi kondisi bisa berubah)
  const validation = await validatePreOpen(periodId);
  if (!validation.allPassed) {
    const failedLabels = validation.checks
      .filter((c) => !c.passed)
      .map((c) => c.label);
    return {
      success: false,
      error: `Validasi gagal: ${failedLabels.join(", ")}`,
    };
  }

  // 3. Generate matrix (atomic transaction internal)
  const matrixResult = await generateMatrixForPeriod(periodId);
  if (!matrixResult.success) {
    return {
      success: false,
      error: matrixResult.error ?? "Gagal generate matriks penilaian",
    };
  }

  // 4. Get admin employee untuk audit
  const adminEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });

  // 5. Update period status DRAFT → OPEN
  try {
    await db
      .update(evaluationPeriods)
      .set({
        status: "OPEN",
        openedAt: new Date(),
        openedBy: adminEmployee?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(evaluationPeriods.id, periodId));

    revalidatePath("/admin/periode");
    revalidatePath(`/admin/periode/${periodId}`);
    return { success: true, periodId };
  } catch (error) {
    // EDGE CASE: matrix sudah ter-generate tapi status update gagal
    // Recovery: admin perlu clear matrix manual via script, lalu coba lagi
    console.error(
      "Critical: status update gagal setelah matrix ter-generate:",
      error,
    );
    return {
      success: false,
      error: `Matriks ter-generate (${matrixResult.evaluationCount} evaluations + ${matrixResult.objectiveCount} objective scores) tetapi update status gagal. Hubungi admin untuk cleanup manual.`,
    };
  }
}

/**
 * Menutup periode: transisi OPEN → CLOSED.
 * Strict validation: harus 100% kelengkapan subjektif + objektif.
 */
export async function closePeriodAction(periodId: string) {
  // 1. Validasi sesi
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }

  const userRoles = session.user.roles ?? [];
  if (!userRoles.includes("ADMIN")) {
    return {
      success: false as const,
      error: "Hanya admin yang dapat menutup periode",
    };
  }

  // 2. Cek status periode
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });

  if (!period) {
    return { success: false as const, error: "Periode tidak ditemukan" };
  }

  if (period.status !== "OPEN") {
    return {
      success: false as const,
      error: `Periode berstatus ${period.status}, tidak dapat ditutup. Hanya periode OPEN yang dapat ditutup.`,
    };
  }

  // 3. Re-validate pre-close (defense in depth)
  const validation = await validatePreClose(periodId);
  if (!validation.allPassed) {
    const failedChecks = validation.checks
      .filter((c) => !c.passed)
      .map((c) => c.label)
      .join("; ");
    return {
      success: false as const,
      error: `Validasi gagal: ${failedChecks}`,
    };
  }

  // 4. Get admin employee untuk audit
  const adminEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });

  // 5. Update status OPEN → CLOSED dengan audit trail
  try {
    await db
      .update(evaluationPeriods)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: adminEmployee?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(evaluationPeriods.id, periodId));

    revalidatePath(`/admin/periode/${periodId}`);
    revalidatePath("/admin/periode");

    return { success: true as const, periodId };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gagal menutup periode",
    };
  }
}
