import { notFound } from "next/navigation";
import { db } from "@/db";
import { criteria, subCriteria } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

import { GroupForm } from "../../group-form";
import { LeafForm } from "../../leaf-form";
import {
  getBlockingPeriod,
  getOtherLeafWeight,
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

  const crit = await db.query.criteria.findFirst({
    where: eq(criteria.id, id),
  });

  if (!crit) {
    notFound();
  }

  const otherLeafWeight = await getOtherLeafWeight(id);
  const blocking = await getBlockingPeriod();
  const hasFinalized = await hasFinalizedPeriods();

  if (crit.hasSubCriteria) {
    // GRUP: load subs
    const subs = await db
      .select()
      .from(subCriteria)
      .where(eq(subCriteria.criteriaId, id))
      .orderBy(asc(subCriteria.displayOrder));

    return (
      <GroupForm
        mode="edit"
        initial={{
          id: crit.id,
          code: crit.code,
          name: crit.name,
          description: crit.description ?? "",
          isActive: crit.isActive,
          subs: subs.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            description: s.description ?? "",
            weight: parseFloat(s.weight),
            type: s.type as "BENEFIT" | "COST",
          })),
        }}
        otherLeafWeight={otherLeafWeight}
        isLocked={!!blocking}
        lockReason={blocking ? formatBlockedMessage(blocking) : null}
        hasFinalizedPeriods={hasFinalized}
      />
    );
  }

  // LEAF
  return (
    <LeafForm
      mode="edit"
      initial={{
        id: crit.id,
        code: crit.code,
        name: crit.name,
        description: crit.description ?? "",
        weight: parseFloat(crit.weight),
        type: crit.type as "BENEFIT" | "COST",
        scoringMethod: crit.scoringMethod as "MULTI_RATER" | "MANUAL_INPUT",
        calculationType: crit.calculationType,
        isActive: crit.isActive,
      }}
      otherLeafWeight={otherLeafWeight}
      isLocked={!!blocking}
      lockReason={blocking ? formatBlockedMessage(blocking) : null}
      hasFinalizedPeriods={hasFinalized}
    />
  );
}
