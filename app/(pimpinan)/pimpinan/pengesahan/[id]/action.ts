"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import { evaluationPeriods, employees } from "@/db/schema";

export async function approvePeriodAction(periodId: string, notes?: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "Tidak terautentikasi" };
  }
  if (!(session.user.roles ?? []).includes("PIMPINAN")) {
    return {
      success: false as const,
      error: "Hanya Pimpinan yang dapat mengesahkan",
    };
  }

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) {
    return { success: false as const, error: "Periode tidak ditemukan" };
  }
  if (period.status !== "AWAITING_APPROVAL") {
    return {
      success: false as const,
      error: `Hanya periode yang menunggu pengesahan yang dapat disahkan. Status saat ini: ${period.status}.`,
    };
  }

  const pimpinanEmployee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });
  if (!pimpinanEmployee) {
    return {
      success: false as const,
      error: "Data pegawai untuk akun Pimpinan tidak ditemukan",
    };
  }

  try {
    await db
      .update(evaluationPeriods)
      .set({
        status: "FINALIZED",
        finalizedAt: new Date(),
        finalizedBy: pimpinanEmployee.id,
        approvalNotes: notes?.trim() ? notes.trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(evaluationPeriods.id, periodId));
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Gagal mengesahkan periode",
    };
  }

  revalidatePath("/pimpinan/pengesahan");
  revalidatePath(`/pimpinan/pengesahan/${periodId}`);
  revalidatePath("/pimpinan/dashboard");
  return { success: true as const };
}
