import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { getCurrentRanking } from "@/lib/ranking-helpers";
import { RankingResultsTable } from "@/components/shared/ranking-results-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApproveAction } from "./approve-action";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PengesahanDetailPage({ params }: PageProps) {
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
          <Link href="/pimpinan/pengesahan">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{period.name}</h1>
        <p className="text-sm text-muted-foreground">
          Tinjau hasil ranking sebelum mengesahkan.
        </p>
      </div>

      {!ranking ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada hasil ranking untuk periode ini.
          </CardContent>
        </Card>
      ) : (
        <>
          <RankingResultsTable
            results={ranking.results}
            metaCriteria={ranking.calculation.metadata.criteria}
          />

          {period.status === "AWAITING_APPROVAL" && (
            <ApproveAction periodId={period.id} />
          )}

          {period.status === "FINALIZED" && (
            <Card>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Telah disahkan</span>
                </div>
                {period.finalizedAt && (
                  <p className="text-sm text-muted-foreground">
                    Disahkan{" "}
                    {new Date(period.finalizedAt).toLocaleString("id-ID")}
                  </p>
                )}
                {period.approvalNotes && (
                  <p className="text-sm">Catatan: {period.approvalNotes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
