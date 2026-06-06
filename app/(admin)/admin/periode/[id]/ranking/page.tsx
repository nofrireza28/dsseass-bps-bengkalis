import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { getCurrentRanking } from "@/lib/ranking-helpers";
import { Button } from "@/components/ui/button";
import { RankingView } from "./ranking-table";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RankingPage({ params }: PageProps) {
  const { id: periodId } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) notFound();

  const ranking = await getCurrentRanking(periodId);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/admin/periode/${periodId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Detail Periode
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Hasil Ranking — Metode SAW</h1>
        <p className="text-sm text-muted-foreground">{period.name}</p>
      </div>

      <RankingView
        periodId={periodId}
        periodStatus={period.status}
        ranking={ranking}
      />
    </div>
  );
}
