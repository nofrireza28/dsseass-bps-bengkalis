"use server";

import { db } from "@/db";
import { criteria, subCriteria, evaluationScores } from "@/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import {
  getBlockingPeriod,
  formatBlockedMessage,
} from "@/lib/criteria-helpers";

const FLOAT_TOLERANCE = 0.0001;

// Schema

const subCriteriaInputSchema = z.object({
  id: z.string(), // bisa UUID existing atau temp ID untuk yang baru
  code: z.string().min(2, "Kode minimal 2 karakter").max(20),
  name: z.string().min(3, "Nama minimal 3 karakter").max(255),
  description: z.string(),
  weight: z.number().min(0.0001, "Bobot harus > 0").max(1, "Bobot maksimal 1"),
  type: z.enum(["BENEFIT", "COST"]),
  isNew: z.boolean(),
  markedForDeletion: z.boolean(),
});

const criteriaInputSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(255),
  description: z.string(),
  weight: z.number().min(0.0001, "Bobot harus > 0").max(1, "Bobot maksimal 1"),
  isActive: z.boolean(),
});

const createCriteriaSchema = z.object({
  code: z.string().min(2, "Kode minimal 2 karakter").max(20),
  name: z.string().min(3, "Nama minimal 3 karakter").max(255),
  description: z.string(),
  weight: z.number().min(0).max(1),
  isActive: z.boolean(),
});

export type CriteriaActionState = {
  success: boolean;
  error?: string;
  criteriaId?: string;
};

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Input tidak valid";
  return issue.message;
}

// Update Criteria

export async function updateCriteriaAction(
  criteriaId: string,
  formData: FormData,
): Promise<CriteriaActionState> {
  await requireRole(["ADMIN"]);

  // Gate periode aktif
  const blocking = await getBlockingPeriod();
  if (blocking) {
    return { success: false, error: formatBlockedMessage(blocking) };
  }

  // Extract data
  const criteriaData = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    weight: parseFloat(String(formData.get("weight") ?? "0")),
    isActive: formData.get("isActive") === "true",
  };

  const subCriteriaJson = String(formData.get("subCriteriaData") ?? "[]");
  let subCriteriaData: Array<z.infer<typeof subCriteriaInputSchema>>;

  try {
    subCriteriaData = JSON.parse(subCriteriaJson);
  } catch {
    return { success: false, error: "Format data sub-kriteria tidak valid" };
  }

  // Validasi format kriteria
  const criteriaParsed = criteriaInputSchema.safeParse(criteriaData);
  if (!criteriaParsed.success) {
    return { success: false, error: formatZodError(criteriaParsed.error) };
  }

  // Validasi setiap sub-kriteria
  for (let i = 0; i < subCriteriaData.length; i++) {
    const subParsed = subCriteriaInputSchema.safeParse(subCriteriaData[i]);
    if (!subParsed.success) {
      return {
        success: false,
        error: `Sub-kriteria ${i + 1}: ${formatZodError(subParsed.error)}`,
      };
    }
  }

  // Pisahkan operasi
  const activeSubs = subCriteriaData.filter((s) => !s.markedForDeletion);
  const subsToDelete = subCriteriaData.filter(
    (s) => s.markedForDeletion && !s.isNew,
  );
  const subsToInsert = subCriteriaData.filter(
    (s) => s.isNew && !s.markedForDeletion,
  );
  const subsToUpdate = subCriteriaData.filter(
    (s) => !s.isNew && !s.markedForDeletion,
  );

  // Minimum 1 sub-kriteria
  if (activeSubs.length === 0) {
    return {
      success: false,
      error: "Kriteria harus memiliki minimal 1 sub-kriteria",
    };
  }

  // Total bobot sub-kriteria aktif = 1.0
  const totalSubWeight = activeSubs.reduce((sum, sc) => sum + sc.weight, 0);
  if (Math.abs(totalSubWeight - 1.0) > FLOAT_TOLERANCE) {
    return {
      success: false,
      error: `Total bobot sub-kriteria harus 100% (saat ini ${(totalSubWeight * 100).toFixed(2)}%)`,
    };
  }

  // Validasi: sub-kriteria yang akan dihapus tidak boleh sudah dipakai
  if (subsToDelete.length > 0) {
    const subIdsToDelete = subsToDelete.map((s) => s.id);
    const referenced = await db
      .select({ id: evaluationScores.subCriteriaId })
      .from(evaluationScores)
      .where(inArray(evaluationScores.subCriteriaId, subIdsToDelete))
      .limit(1);

    if (referenced.length > 0) {
      return {
        success: false,
        error:
          "Salah satu sub-kriteria yang akan dihapus pernah dipakai dalam penilaian. Tidak dapat dihapus untuk menjaga integritas data historis.",
      };
    }
  }

  // Validasi cek code unik untuk sub-kriteria baru
  if (subsToInsert.length > 0) {
    const newCodes = subsToInsert.map((s) => s.code);
    const existingCodes = await db
      .select({ code: subCriteria.code })
      .from(subCriteria)
      .where(inArray(subCriteria.code, newCodes));

    if (existingCodes.length > 0) {
      return {
        success: false,
        error: `Kode sub-kriteria sudah dipakai: ${existingCodes.map((c) => c.code).join(", ")}`,
      };
    }
  }

  // Validasi total bobot kriteria utama
  const otherCriteria = await db
    .select({ weight: criteria.weight })
    .from(criteria)
    .where(and(eq(criteria.isActive, true), ne(criteria.id, criteriaId)));

  const otherTotalWeight = otherCriteria.reduce(
    (sum, c) => sum + parseFloat(c.weight),
    0,
  );

  if (criteriaParsed.data.isActive) {
    const grandTotal = otherTotalWeight + criteriaParsed.data.weight;
    if (Math.abs(grandTotal - 1.0) > FLOAT_TOLERANCE) {
      return {
        success: false,
        error: `Total bobot semua kriteria aktif harus 100% (saat ini ${(grandTotal * 100).toFixed(2)}%). Sesuaikan bobot kriteria lain terlebih dahulu.`,
      };
    }
  }

  // Eksekusi
  try {
    // Update criteria
    await db
      .update(criteria)
      .set({
        name: criteriaParsed.data.name,
        description: criteriaParsed.data.description || null,
        weight: criteriaParsed.data.weight.toFixed(4),
        isActive: criteriaParsed.data.isActive,
        hasSubCriteria: activeSubs.length > 1,
        updatedAt: new Date(),
      })
      .where(eq(criteria.id, criteriaId));

    // Delete sub-kriteria
    if (subsToDelete.length > 0) {
      await db.delete(subCriteria).where(
        inArray(
          subCriteria.id,
          subsToDelete.map((s) => s.id),
        ),
      );
    }

    // Update sub-kriteria existing
    for (const sub of subsToUpdate) {
      await db
        .update(subCriteria)
        .set({
          code: sub.code,
          name: sub.name,
          description: sub.description || null,
          weight: sub.weight.toFixed(4),
          type: sub.type,
          updatedAt: new Date(),
        })
        .where(eq(subCriteria.id, sub.id));
    }

    // Insert sub-kriteria baru
    if (subsToInsert.length > 0) {
      // Get max display_order yang sudah ada
      const existingSubs = await db
        .select({ displayOrder: subCriteria.displayOrder })
        .from(subCriteria)
        .where(eq(subCriteria.criteriaId, criteriaId));

      const maxOrder = existingSubs.reduce(
        (max, s) => Math.max(max, s.displayOrder),
        0,
      );

      let nextOrder = maxOrder + 1;
      const newRows = subsToInsert.map((s) => ({
        criteriaId,
        code: s.code,
        name: s.name,
        description: s.description || null,
        weight: s.weight.toFixed(4),
        type: s.type,
        displayOrder: nextOrder++,
      }));

      await db.insert(subCriteria).values(newRows);
    }

    revalidatePath("/admin/kriteria");
    revalidatePath(`/admin/kriteria/${criteriaId}/edit`);
    return { success: true, criteriaId };
  } catch (error) {
    console.error("Failed to update criteria:", error);
    return { success: false, error: "Gagal menyimpan perubahan" };
  }
}

// Create Criteria

export async function createCriteriaAction(
  formData: FormData,
): Promise<CriteriaActionState> {
  await requireRole(["ADMIN"]);

  // Gate periode aktif
  const blocking = await getBlockingPeriod();
  if (blocking) {
    return { success: false, error: formatBlockedMessage(blocking) };
  }

  const criteriaData = {
    code: String(formData.get("code") ?? "")
      .toUpperCase()
      .trim(),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    weight: parseFloat(String(formData.get("weight") ?? "0")),
    isActive: formData.get("isActive") === "true",
  };

  const subCriteriaJson = String(formData.get("subCriteriaData") ?? "[]");
  let subCriteriaData: Array<{
    code: string;
    name: string;
    description: string;
    weight: number;
    type: "BENEFIT" | "COST";
  }>;

  try {
    subCriteriaData = JSON.parse(subCriteriaJson);
  } catch {
    return { success: false, error: "Format data sub-kriteria tidak valid" };
  }

  // Validasi format
  const criteriaParsed = createCriteriaSchema.safeParse(criteriaData);
  if (!criteriaParsed.success) {
    return { success: false, error: formatZodError(criteriaParsed.error) };
  }

  if (subCriteriaData.length === 0) {
    return {
      success: false,
      error: "Kriteria harus memiliki minimal 1 sub-kriteria",
    };
  }

  for (let i = 0; i < subCriteriaData.length; i++) {
    const subParsed = z
      .object({
        code: z.string().min(2).max(20),
        name: z.string().min(3).max(255),
        description: z.string(),
        weight: z.number().min(0.0001).max(1),
        type: z.enum(["BENEFIT", "COST"]),
      })
      .safeParse(subCriteriaData[i]);
    if (!subParsed.success) {
      return {
        success: false,
        error: `Sub-kriteria ${i + 1}: ${formatZodError(subParsed.error)}`,
      };
    }
  }

  // Validasi total bobot sub-kriteria
  const totalSubWeight = subCriteriaData.reduce(
    (sum, sc) => sum + sc.weight,
    0,
  );
  if (Math.abs(totalSubWeight - 1.0) > FLOAT_TOLERANCE) {
    return {
      success: false,
      error: `Total bobot sub-kriteria harus 100% (saat ini ${(totalSubWeight * 100).toFixed(2)}%)`,
    };
  }

  // Cek code kriteria unik
  const existingCriteria = await db
    .select({ code: criteria.code })
    .from(criteria)
    .where(eq(criteria.code, criteriaParsed.data.code))
    .limit(1);

  if (existingCriteria.length > 0) {
    return {
      success: false,
      error: `Kode kriteria "${criteriaParsed.data.code}" sudah dipakai`,
    };
  }

  // Cek code sub-kriteria unik
  const newSubCodes = subCriteriaData.map((s) => s.code.toUpperCase().trim());
  const duplicateSubs = await db
    .select({ code: subCriteria.code })
    .from(subCriteria)
    .where(inArray(subCriteria.code, newSubCodes));

  if (duplicateSubs.length > 0) {
    return {
      success: false,
      error: `Kode sub-kriteria sudah dipakai: ${duplicateSubs.map((c) => c.code).join(", ")}`,
    };
  }

  // Validasi total bobot kriteria utama jika aktif
  if (criteriaParsed.data.isActive) {
    const allActiveCriteria = await db
      .select({ weight: criteria.weight })
      .from(criteria)
      .where(eq(criteria.isActive, true));

    const currentTotal = allActiveCriteria.reduce(
      (sum, c) => sum + parseFloat(c.weight),
      0,
    );

    const grandTotal = currentTotal + criteriaParsed.data.weight;
    if (Math.abs(grandTotal - 1.0) > FLOAT_TOLERANCE) {
      return {
        success: false,
        error: `Total bobot akan menjadi ${(grandTotal * 100).toFixed(2)}% (harus 100%). Pilihan: 1) Sesuaikan bobot kriteria lain terlebih dahulu, atau 2) Buat kriteria ini sebagai non-aktif dulu.`,
      };
    }
  }

  // Eksekusi
  let newCriteriaId: string;
  try {
    // Ambil max display_order kriteria
    const allCriteria = await db
      .select({ displayOrder: criteria.displayOrder })
      .from(criteria);

    const maxOrder = allCriteria.reduce(
      (max, c) => Math.max(max, c.displayOrder),
      0,
    );

    // Insert kriteria
    const [newCrit] = await db
      .insert(criteria)
      .values({
        code: criteriaParsed.data.code,
        name: criteriaParsed.data.name,
        description: criteriaParsed.data.description || null,
        weight: criteriaParsed.data.weight.toFixed(4),
        hasSubCriteria: subCriteriaData.length > 1,
        displayOrder: maxOrder + 1,
        isActive: criteriaParsed.data.isActive,
      })
      .returning({ id: criteria.id });

    newCriteriaId = newCrit.id;

    // Insert sub-kriteria
    await db.insert(subCriteria).values(
      subCriteriaData.map((sub, idx) => ({
        criteriaId: newCriteriaId,
        code: sub.code.toUpperCase().trim(),
        name: sub.name,
        description: sub.description || null,
        weight: sub.weight.toFixed(4),
        type: sub.type,
        displayOrder: idx + 1,
      })),
    );

    revalidatePath("/admin/kriteria");
  } catch (error) {
    console.error("Failed to create criteria:", error);
    return { success: false, error: "Gagal membuat kriteria" };
  }

  return { success: true, criteriaId: newCriteriaId };
}

// Delete Criteria

export async function deleteCriteriaAction(
  criteriaId: string,
): Promise<CriteriaActionState> {
  await requireRole(["ADMIN"]);

  // Gate periode aktif
  const blocking = await getBlockingPeriod();
  if (blocking) {
    return { success: false, error: formatBlockedMessage(blocking) };
  }

  // Cek kriteria exists
  const crit = await db.query.criteria.findFirst({
    where: eq(criteria.id, criteriaId),
  });

  if (!crit) {
    return { success: false, error: "Kriteria tidak ditemukan" };
  }

  // Cek apakah sub-kriteria pernah dipakai di evaluation_scores
  const referenced = await db
    .select({ id: evaluationScores.id })
    .from(evaluationScores)
    .innerJoin(subCriteria, eq(evaluationScores.subCriteriaId, subCriteria.id))
    .where(eq(subCriteria.criteriaId, criteriaId))
    .limit(1);

  if (referenced.length > 0) {
    return {
      success: false,
      error: `Kriteria "${crit.code} - ${crit.name}" tidak dapat dihapus karena pernah dipakai dalam penilaian. Untuk menjaga integritas data historis, nonaktifkan saja kriteria ini melalui menu Edit.`,
    };
  }

  try {
    // Delete sub-kriteria dulu (FK RESTRICT)
    await db.delete(subCriteria).where(eq(subCriteria.criteriaId, criteriaId));

    // Delete kriteria
    await db.delete(criteria).where(eq(criteria.id, criteriaId));

    revalidatePath("/admin/kriteria");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete criteria:", error);
    return { success: false, error: "Gagal menghapus kriteria" };
  }
}
