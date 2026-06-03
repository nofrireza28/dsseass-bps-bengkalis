"use server";

import { db } from "@/db";
import { periodParticipants, employees, evaluationPeriods } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";

export type ParticipantActionState = {
  success: boolean;
  error?: string;
  count?: number;
};

/**
 * Helper: pastikan periode masih DRAFT (boleh edit partisipan)
 */
async function assertDraftPeriod(periodId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
    columns: { id: true, status: true },
  });

  if (!period) {
    return { ok: false, error: "Periode tidak ditemukan" };
  }
  if (period.status !== "DRAFT") {
    return {
      ok: false,
      error: `Periode berstatus ${period.status} — daftar partisipan tidak dapat diubah.`,
    };
  }
  return { ok: true };
}

// ============== ADD SINGLE ==============

export async function addParticipantAction(
  periodId: string,
  employeeId: string,
): Promise<ParticipantActionState> {
  await requireRole(["ADMIN"]);

  const check = await assertDraftPeriod(periodId);
  if (!check.ok) return { success: false, error: check.error };

  // Verify employee exists & active
  const employee = await db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.status, "ACTIVE")),
  });
  if (!employee) {
    return {
      success: false,
      error: "Pegawai tidak ditemukan atau tidak aktif",
    };
  }

  // Check duplicate
  const existing = await db.query.periodParticipants.findFirst({
    where: and(
      eq(periodParticipants.periodId, periodId),
      eq(periodParticipants.employeeId, employeeId),
    ),
  });
  if (existing) {
    return { success: false, error: "Pegawai sudah menjadi partisipan" };
  }

  try {
    await db.insert(periodParticipants).values({
      periodId,
      employeeId,
      isEvaluator: true,
      isEvaluatee: true,
    });

    revalidatePath(`/admin/periode/${periodId}`);
    revalidatePath(`/admin/periode/${periodId}/partisipan`);
    return { success: true };
  } catch (error) {
    console.error("Failed to add participant:", error);
    return { success: false, error: "Gagal menambah partisipan" };
  }
}

// ============== ADD ALL ACTIVE EMPLOYEES ==============

export async function addAllActiveEmployeesAction(
  periodId: string,
): Promise<ParticipantActionState> {
  await requireRole(["ADMIN"]);

  const check = await assertDraftPeriod(periodId);
  if (!check.ok) return { success: false, error: check.error };

  try {
    const allActive = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));

    if (allActive.length === 0) {
      return { success: false, error: "Tidak ada pegawai aktif" };
    }

    // Skip yang sudah jadi partisipan
    const existingParticipants = await db
      .select({ employeeId: periodParticipants.employeeId })
      .from(periodParticipants)
      .where(eq(periodParticipants.periodId, periodId));

    const existingIds = new Set(existingParticipants.map((p) => p.employeeId));
    const toAdd = allActive.filter((e) => !existingIds.has(e.id));

    if (toAdd.length === 0) {
      return {
        success: false,
        error: "Semua pegawai aktif sudah menjadi partisipan",
      };
    }

    await db.insert(periodParticipants).values(
      toAdd.map((e) => ({
        periodId,
        employeeId: e.id,
        isEvaluator: true,
        isEvaluatee: true,
      })),
    );

    revalidatePath(`/admin/periode/${periodId}`);
    revalidatePath(`/admin/periode/${periodId}/partisipan`);
    return { success: true, count: toAdd.length };
  } catch (error) {
    console.error("Failed to add all employees:", error);
    return { success: false, error: "Gagal menambahkan semua pegawai" };
  }
}

// ============== REMOVE ==============

export async function removeParticipantAction(
  periodId: string,
  employeeId: string,
): Promise<ParticipantActionState> {
  await requireRole(["ADMIN"]);

  const check = await assertDraftPeriod(periodId);
  if (!check.ok) return { success: false, error: check.error };

  try {
    await db
      .delete(periodParticipants)
      .where(
        and(
          eq(periodParticipants.periodId, periodId),
          eq(periodParticipants.employeeId, employeeId),
        ),
      );

    revalidatePath(`/admin/periode/${periodId}`);
    revalidatePath(`/admin/periode/${periodId}/partisipan`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove participant:", error);
    return { success: false, error: "Gagal menghapus partisipan" };
  }
}

// ============== UPDATE ROLE ==============

export async function updateParticipantRoleAction(
  periodId: string,
  employeeId: string,
  isEvaluator: boolean,
  isEvaluatee: boolean,
): Promise<ParticipantActionState> {
  await requireRole(["ADMIN"]);

  const check = await assertDraftPeriod(periodId);
  if (!check.ok) return { success: false, error: check.error };

  if (!isEvaluator && !isEvaluatee) {
    return {
      success: false,
      error:
        "Partisipan harus memiliki minimal satu peran (penilai atau dinilai)",
    };
  }

  try {
    await db
      .update(periodParticipants)
      .set({ isEvaluator, isEvaluatee })
      .where(
        and(
          eq(periodParticipants.periodId, periodId),
          eq(periodParticipants.employeeId, employeeId),
        ),
      );

    revalidatePath(`/admin/periode/${periodId}`);
    revalidatePath(`/admin/periode/${periodId}/partisipan`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update participant role:", error);
    return { success: false, error: "Gagal memperbarui peran partisipan" };
  }
}

// ============== CLEAR ALL ==============

export async function clearAllParticipantsAction(
  periodId: string,
): Promise<ParticipantActionState> {
  await requireRole(["ADMIN"]);

  const check = await assertDraftPeriod(periodId);
  if (!check.ok) return { success: false, error: check.error };

  try {
    const result = await db
      .delete(periodParticipants)
      .where(eq(periodParticipants.periodId, periodId))
      .returning();

    revalidatePath(`/admin/periode/${periodId}`);
    revalidatePath(`/admin/periode/${periodId}/partisipan`);
    return { success: true, count: result.length };
  } catch (error) {
    console.error("Failed to clear participants:", error);
    return { success: false, error: "Gagal menghapus semua partisipan" };
  }
}
