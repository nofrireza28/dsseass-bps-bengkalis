import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import {
  getObjectiveCriteriaById,
  getObjectiveScoresByCriteria,
} from "@/lib/objective-score-helpers";
import { getPeriodMonths } from "@/lib/objective-calc";
import { Button } from "@/components/ui/button";
import { ObjectiveInputTable } from "./objective-input-table";

interface PageProps {
  params: Promise<{ id: string; criteriaId: string }>;
}

export default async function ObjectiveCriteriaDetailPage({
  params,
}: PageProps) {
  const { id: periodId, criteriaId } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) notFound();

  const criteriaInfo = await getObjectiveCriteriaById(criteriaId);
  if (!criteriaInfo) notFound();

  const scores = await getObjectiveScoresByCriteria(periodId, criteriaId);
  const months = getPeriodMonths(
    period.periodType,
    period.year,
    period.periodIndex,
    period.startDate,
    period.endDate,
  );

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/admin/periode/${periodId}/penilaian-objektif`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Penilaian Objektif
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{criteriaInfo.name}</h1>
        <p className="text-sm text-muted-foreground">
          {criteriaInfo.code} · {period.name}
        </p>
      </div>

      <ObjectiveInputTable
        scores={scores}
        months={months}
        calculationType={criteriaInfo.calculationType}
        criteriaName={criteriaInfo.name}
        isReadOnly={period.status !== "OPEN"}
        periodStatus={period.status}
      />
    </div>
  );
}
