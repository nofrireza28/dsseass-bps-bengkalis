"use server";

import { db } from "@/db";
import { criteria, subCriteria, evaluationScores } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import {
  getBlockingPeriod,
  getOtherLeafWeight,
  getCurrentTotalLeafWeight,
  formatBlockedMessage,
} from "@/lib/criteria-helpers";

const FLOAT_TOLERANCE = 0.0001;

// ============== SCHEMAS ==============

const subCriteriaInputSchema = z.object({
  id: z.string(),
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(255),
  description: z.string(),
  weight: z.number().min(0.0001).max(1),
  type: z.enum(["BENEFIT", "COST"]),
  isNew: z.boolean(),
  markedForDeletion: z.boolean(),
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

// ============== UPDATE CRITERIA ==============

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

  // Get existing untuk tahu apakah grup atau leaf (immutable setelah create)
  const existing = await db.query.criteria.findFirst({
    where: eq(criteria.id, criteriaId),
  });
  if (!existing) {
    return { success: false, error: "Kriteria tidak ditemukan" };
  }

  const isGroup = existing.hasSubCriteria;

  // Extract common fields with fallback ke existing
  const name = String(formData.get("name") ?? existing.name);
  const description = String(
    formData.get("description") ?? existing.description ?? "",
  );
  const isActive = formData.has("isActive")
    ? formData.get("isActive") === "true"
    : existing.isActive;

  // =========== GRUP ===========
  if (isGroup) {
    return await updateGroupCriteria(criteriaId, existing, formData, {
      name,
      description,
      isActive,
    });
  }

  // =========== LEAF ===========
  return await updateLeafCriteria(criteriaId, existing, formData, {
    name,
    description,
    isActive,
  });
}

async function updateGroupCriteria(
  criteriaId: string,
  existing: typeof criteria.$inferSelect,
  formData: FormData,
  common: { name: string; description: string; isActive: boolean },
): Promise<CriteriaActionState> {
  // Extract sub-criteria operations
  const subCriteriaJson = String(formData.get("subCriteriaData") ?? "[]");
  let subData: Array<z.infer<typeof subCriteriaInputSchema>>;

  try {
    subData = JSON.parse(subCriteriaJson);
  } catch {
    return { success: false, error: "Format data sub-kriteria tidak valid" };
  }

  // Validasi setiap sub
  for (let i = 0; i < subData.length; i++) {
    const parsed = subCriteriaInputSchema.safeParse(subData[i]);
    if (!parsed.success) {
      return {
        success: false,
        error: `Sub-kriteria ${i + 1}: ${formatZodError(parsed.error)}`,
      };
    }
  }

  // Pisahkan operasi
  const activeSubs = subData.filter((s) => !s.markedForDeletion);
  const subsToDelete = subData.filter((s) => s.markedForDeletion && !s.isNew);
  const subsToInsert = subData.filter((s) => s.isNew && !s.markedForDeletion);
  const subsToUpdate = subData.filter((s) => !s.isNew && !s.markedForDeletion);

  if (activeSubs.length === 0) {
    return {
      success: false,
      error: "Kriteria grup harus memiliki minimal 1 sub-kriteria",
    };
  }

  // Weight criteria induk = SUM sub aktif (untuk display/info)
  const newGroupWeight = activeSubs.reduce((s, sc) => s + sc.weight, 0);

  // Validasi total leaf = 100% jika aktif
  if (common.isActive) {
    const otherLeafWeight = await getOtherLeafWeight(criteriaId);
    const totalLeaf = newGroupWeight + otherLeafWeight;
    if (Math.abs(totalLeaf - 1.0) > FLOAT_TOLERANCE) {
      return {
        success: false,
        error: `Total bobot leaf harus 100% (saat ini ${(totalLeaf * 100).toFixed(2)}%). Sesuaikan bobot di kriteria/sub-kriteria lain.`,
      };
    }
  }

  // Cek sub yang akan dihapus tidak ter-reference
  if (subsToDelete.length > 0) {
    const referenced = await db
      .select({ id: evaluationScores.subCriteriaId })
      .from(evaluationScores)
      .where(
        inArray(
          evaluationScores.subCriteriaId,
          subsToDelete.map((s) => s.id),
        ),
      )
      .limit(1);

    if (referenced.length > 0) {
      return {
        success: false,
        error:
          "Salah satu sub-kriteria yang akan dihapus pernah dipakai dalam penilaian.",
      };
    }
  }

  // Cek kode unik untuk sub baru
  if (subsToInsert.length > 0) {
    const newCodes = subsToInsert.map((s) => s.code);
    const dups = await db
      .select({ code: subCriteria.code })
      .from(subCriteria)
      .where(inArray(subCriteria.code, newCodes));

    if (dups.length > 0) {
      return {
        success: false,
        error: `Kode sub-kriteria sudah dipakai: ${dups.map((c) => c.code).join(", ")}`,
      };
    }
  }

  // Eksekusi
  try {
    await db
      .update(criteria)
      .set({
        name: common.name,
        description: common.description || null,
        weight: newGroupWeight.toFixed(4),
        isActive: common.isActive,
        updatedAt: new Date(),
      })
      .where(eq(criteria.id, criteriaId));

    if (subsToDelete.length > 0) {
      await db.delete(subCriteria).where(
        inArray(
          subCriteria.id,
          subsToDelete.map((s) => s.id),
        ),
      );
    }

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

    if (subsToInsert.length > 0) {
      const existingSubs = await db
        .select({ displayOrder: subCriteria.displayOrder })
        .from(subCriteria)
        .where(eq(subCriteria.criteriaId, criteriaId));

      const maxOrder = existingSubs.reduce(
        (m, s) => Math.max(m, s.displayOrder),
        0,
      );

      let order = maxOrder + 1;
      await db.insert(subCriteria).values(
        subsToInsert.map((s) => ({
          criteriaId,
          code: s.code,
          name: s.name,
          description: s.description || null,
          weight: s.weight.toFixed(4),
          type: s.type,
          displayOrder: order++,
        })),
      );
    }

    revalidatePath("/admin/kriteria");
    revalidatePath(`/admin/kriteria/${criteriaId}/edit`);
    return { success: true, criteriaId };
  } catch (error) {
    console.error("Failed to update group criteria:", error);
    return { success: false, error: "Gagal menyimpan perubahan" };
  }
}

async function updateLeafCriteria(
  criteriaId: string,
  existing: typeof criteria.$inferSelect,
  formData: FormData,
  common: { name: string; description: string; isActive: boolean },
): Promise<CriteriaActionState> {
  // Extract leaf-specific fields
  const weight = parseFloat(String(formData.get("weight") ?? existing.weight));
  const typeVal = formData.has("type")
    ? String(formData.get("type"))
    : existing.type;
  const scoringMethod = formData.has("scoringMethod")
    ? String(formData.get("scoringMethod"))
    : existing.scoringMethod;
  const calculationType =
    scoringMethod === "MANUAL_INPUT"
      ? formData.has("calculationType")
        ? String(formData.get("calculationType"))
        : existing.calculationType
      : null;

  // Validasi
  if (weight <= 0 || weight > 1) {
    return { success: false, error: "Bobot harus antara 0 dan 1" };
  }
  if (!["BENEFIT", "COST"].includes(typeVal)) {
    return { success: false, error: "Tipe tidak valid" };
  }
  if (!["MULTI_RATER", "MANUAL_INPUT"].includes(scoringMethod)) {
    return { success: false, error: "Metode penilaian tidak valid" };
  }
  if (scoringMethod === "MANUAL_INPUT" && !calculationType) {
    return {
      success: false,
      error:
        "Metode kalkulasi wajib dipilih untuk kriteria yang diinput manual",
    };
  }
  if (
    calculationType &&
    !["DIRECT", "MONTHLY_AVERAGE", "ABSENCE_THRESHOLD"].includes(
      calculationType,
    )
  ) {
    return { success: false, error: "Metode kalkulasi tidak valid" };
  }

  // Validasi total leaf
  if (common.isActive) {
    const otherLeafWeight = await getOtherLeafWeight(criteriaId);
    const totalLeaf = weight + otherLeafWeight;
    if (Math.abs(totalLeaf - 1.0) > FLOAT_TOLERANCE) {
      return {
        success: false,
        error: `Total bobot leaf harus 100% (saat ini ${(totalLeaf * 100).toFixed(2)}%). Sesuaikan bobot di kriteria/sub-kriteria lain.`,
      };
    }
  }

  try {
    await db
      .update(criteria)
      .set({
        name: common.name,
        description: common.description || null,
        weight: weight.toFixed(4),
        isActive: common.isActive,
        scoringMethod,
        calculationType,
        type: typeVal,
        updatedAt: new Date(),
      })
      .where(eq(criteria.id, criteriaId));

    revalidatePath("/admin/kriteria");
    revalidatePath(`/admin/kriteria/${criteriaId}/edit`);
    return { success: true, criteriaId };
  } catch (error) {
    console.error("Failed to update leaf criteria:", error);
    return { success: false, error: "Gagal menyimpan perubahan" };
  }
}

// ============== CREATE CRITERIA ==============

export async function createCriteriaAction(
  formData: FormData,
): Promise<CriteriaActionState> {
  await requireRole(["ADMIN"]);

  const blocking = await getBlockingPeriod();
  if (blocking) {
    return { success: false, error: formatBlockedMessage(blocking) };
  }

  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .trim();
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const isActive = formData.get("isActive") === "true";
  const isGroup = formData.get("isGroup") === "true";

  if (code.length < 2 || code.length > 20) {
    return { success: false, error: "Kode harus 2-20 karakter" };
  }
  if (name.length < 3) {
    return { success: false, error: "Nama minimal 3 karakter" };
  }

  // Cek code unik
  const existing = await db
    .select({ code: criteria.code })
    .from(criteria)
    .where(eq(criteria.code, code))
    .limit(1);
  if (existing.length > 0) {
    return { success: false, error: `Kode "${code}" sudah dipakai` };
  }

  if (isGroup) {
    return await createGroupCriteria(formData, {
      code,
      name,
      description,
      isActive,
    });
  }

  return await createLeafCriteria(formData, {
    code,
    name,
    description,
    isActive,
  });
}

async function createGroupCriteria(
  formData: FormData,
  common: {
    code: string;
    name: string;
    description: string;
    isActive: boolean;
  },
): Promise<CriteriaActionState> {
  const subCriteriaJson = String(formData.get("subCriteriaData") ?? "[]");
  let subData: Array<{
    code: string;
    name: string;
    description: string;
    weight: number;
    type: "BENEFIT" | "COST";
  }>;

  try {
    subData = JSON.parse(subCriteriaJson);
  } catch {
    return { success: false, error: "Format data sub-kriteria tidak valid" };
  }

  if (subData.length === 0) {
    return {
      success: false,
      error: "Kriteria grup harus memiliki minimal 1 sub-kriteria",
    };
  }

  // Validasi setiap sub
  const subSchema = z.object({
    code: z.string().min(2).max(20),
    name: z.string().min(3).max(255),
    description: z.string(),
    weight: z.number().min(0.0001).max(1),
    type: z.enum(["BENEFIT", "COST"]),
  });

  for (let i = 0; i < subData.length; i++) {
    const parsed = subSchema.safeParse(subData[i]);
    if (!parsed.success) {
      return {
        success: false,
        error: `Sub-kriteria ${i + 1}: ${formatZodError(parsed.error)}`,
      };
    }
  }

  // Cek code sub unik
  const subCodes = subData.map((s) => s.code.toUpperCase().trim());
  const dups = await db
    .select({ code: subCriteria.code })
    .from(subCriteria)
    .where(inArray(subCriteria.code, subCodes));
  if (dups.length > 0) {
    return {
      success: false,
      error: `Kode sub-kriteria sudah dipakai: ${dups.map((c) => c.code).join(", ")}`,
    };
  }

  const groupWeight = subData.reduce((s, sc) => s + sc.weight, 0);

  // Validasi total leaf
  if (common.isActive) {
    const currentTotal = await getCurrentTotalLeafWeight();
    const newTotal = currentTotal + groupWeight;
    if (Math.abs(newTotal - 1.0) > FLOAT_TOLERANCE) {
      return {
        success: false,
        error: `Total bobot leaf akan menjadi ${(newTotal * 100).toFixed(2)}% (harus 100%). Sesuaikan bobot lain dulu, atau buat sebagai non-aktif.`,
      };
    }
  }

  let newCriteriaId: string;
  try {
    const allCriteria = await db
      .select({ displayOrder: criteria.displayOrder })
      .from(criteria);
    const maxOrder = allCriteria.reduce(
      (m, c) => Math.max(m, c.displayOrder),
      0,
    );

    const [newCrit] = await db
      .insert(criteria)
      .values({
        code: common.code,
        name: common.name,
        description: common.description || null,
        weight: groupWeight.toFixed(4),
        hasSubCriteria: true,
        scoringMethod: "MULTI_RATER",
        calculationType: null,
        type: "BENEFIT",
        displayOrder: maxOrder + 1,
        isActive: common.isActive,
      })
      .returning({ id: criteria.id });

    newCriteriaId = newCrit.id;

    await db.insert(subCriteria).values(
      subData.map((sub, idx) => ({
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
    console.error("Failed to create group criteria:", error);
    return { success: false, error: "Gagal membuat kriteria" };
  }

  return { success: true, criteriaId: newCriteriaId };
}

async function createLeafCriteria(
  formData: FormData,
  common: {
    code: string;
    name: string;
    description: string;
    isActive: boolean;
  },
): Promise<CriteriaActionState> {
  const weight = parseFloat(String(formData.get("weight") ?? "0"));
  const typeVal = String(formData.get("type") ?? "BENEFIT");
  const scoringMethod = String(formData.get("scoringMethod") ?? "MULTI_RATER");
  const calculationType =
    scoringMethod === "MANUAL_INPUT"
      ? String(formData.get("calculationType") ?? "DIRECT")
      : null;

  if (weight <= 0 || weight > 1) {
    return { success: false, error: "Bobot harus antara 0 dan 1" };
  }
  if (!["BENEFIT", "COST"].includes(typeVal)) {
    return { success: false, error: "Tipe tidak valid" };
  }
  if (!["MULTI_RATER", "MANUAL_INPUT"].includes(scoringMethod)) {
    return { success: false, error: "Metode penilaian tidak valid" };
  }
  if (
    calculationType &&
    !["DIRECT", "MONTHLY_AVERAGE", "ABSENCE_THRESHOLD"].includes(
      calculationType,
    )
  ) {
    return { success: false, error: "Metode kalkulasi tidak valid" };
  }

  if (common.isActive) {
    const currentTotal = await getCurrentTotalLeafWeight();
    const newTotal = currentTotal + weight;
    if (Math.abs(newTotal - 1.0) > FLOAT_TOLERANCE) {
      return {
        success: false,
        error: `Total bobot leaf akan menjadi ${(newTotal * 100).toFixed(2)}% (harus 100%). Sesuaikan bobot lain dulu, atau buat sebagai non-aktif.`,
      };
    }
  }

  let newCriteriaId: string;
  try {
    const allCriteria = await db
      .select({ displayOrder: criteria.displayOrder })
      .from(criteria);
    const maxOrder = allCriteria.reduce(
      (m, c) => Math.max(m, c.displayOrder),
      0,
    );

    const [newCrit] = await db
      .insert(criteria)
      .values({
        code: common.code,
        name: common.name,
        description: common.description || null,
        weight: weight.toFixed(4),
        hasSubCriteria: false,
        scoringMethod,
        calculationType,
        type: typeVal,
        displayOrder: maxOrder + 1,
        isActive: common.isActive,
      })
      .returning({ id: criteria.id });

    newCriteriaId = newCrit.id;
    revalidatePath("/admin/kriteria");
  } catch (error) {
    console.error("Failed to create leaf criteria:", error);
    return { success: false, error: "Gagal membuat kriteria" };
  }

  return { success: true, criteriaId: newCriteriaId };
}

// ============== DELETE CRITERIA ==============

export async function deleteCriteriaAction(
  criteriaId: string,
): Promise<CriteriaActionState> {
  await requireRole(["ADMIN"]);

  const blocking = await getBlockingPeriod();
  if (blocking) {
    return { success: false, error: formatBlockedMessage(blocking) };
  }

  const crit = await db.query.criteria.findFirst({
    where: eq(criteria.id, criteriaId),
  });

  if (!crit) {
    return { success: false, error: "Kriteria tidak ditemukan" };
  }

  // Cek reference di evaluation_scores (hanya untuk grup yang punya sub)
  if (crit.hasSubCriteria) {
    const referenced = await db
      .select({ id: evaluationScores.id })
      .from(evaluationScores)
      .innerJoin(
        subCriteria,
        eq(evaluationScores.subCriteriaId, subCriteria.id),
      )
      .where(eq(subCriteria.criteriaId, criteriaId))
      .limit(1);

    if (referenced.length > 0) {
      return {
        success: false,
        error: `Kriteria "${crit.code} - ${crit.name}" tidak dapat dihapus karena pernah dipakai dalam penilaian. Nonaktifkan saja melalui menu Edit.`,
      };
    }
  }

  // TODO Fase 5: untuk leaf criteria, cek juga reference di objective_scores

  try {
    if (crit.hasSubCriteria) {
      await db
        .delete(subCriteria)
        .where(eq(subCriteria.criteriaId, criteriaId));
    }
    await db.delete(criteria).where(eq(criteria.id, criteriaId));

    revalidatePath("/admin/kriteria");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete criteria:", error);
    return { success: false, error: "Gagal menghapus kriteria" };
  }
}
