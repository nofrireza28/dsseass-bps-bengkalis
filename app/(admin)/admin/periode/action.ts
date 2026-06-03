"use server";

import { db } from "@/db";
import { evaluationPeriods, employees, periodParticipants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { isDuplicatePeriod } from "@/lib/period-helpers";
import { PERIOD_TYPES, type PeriodType } from "@/lib/period-constants";

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
