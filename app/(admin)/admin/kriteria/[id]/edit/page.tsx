import { notFound } from "next/navigation";
import { db } from "@/db";
import { criteria, subCriteria } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

import { CriteriaEditForm } from "./criteria-edit-form";
import {
  getBlockingPeriod,
  hasFinalizedPeriods,
  formatBlockedMessage,
} from "@/lib/criteria-helpers";

interface EditCriteriaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCriteriaPage({
  params,
}: EditCriteriaPageProps) {
  const { id } = await params;

  // Ambil kriteria
  const crit = await db.query.criteria.findFirst({
    where: eq(criteria.id, id),
  });

  if (!crit) {
    notFound();
  }

  // Ambil sub-kriteria
  const subs = await db
    .select()
    .from(subCriteria)
    .where(eq(subCriteria.criteriaId, id))
    .orderBy(asc(subCriteria.displayOrder));

  // Check periode aktif
  const blocking = await getBlockingPeriod();
  const hasFinalized = await hasFinalizedPeriods();

  return (
    <CriteriaEditForm
      criteria={{
        id: crit.id,
        code: crit.code,
        name: crit.name,
        description: crit.description ?? "",
        weight: parseFloat(crit.weight),
        hasSubCriteria: crit.hasSubCriteria,
        isActive: crit.isActive,
      }}
      subCriteria={subs.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        description: s.description ?? "",
        weight: parseFloat(s.weight),
        type: s.type as "BENEFIT" | "COST",
      }))}
      isLocked={!!blocking}
      lockReason={blocking ? formatBlockedMessage(blocking) : null}
      hasFinalizedPeriods={hasFinalized}
    />
  );
}
