import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { getCurrentRanking } from "@/lib/ranking-helpers";
import { PodiumTop3 } from "./podium-top3";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function HasilDetail({
  periodId,
  backPath,
}: {
  periodId: string;
  backPath: string;
}) {
  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) notFound();

  if (period.status !== "FINALIZED") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backPath}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Hasil periode ini belum dipublikasikan.
          </CardContent>
        </Card>
      </div>
    );
  }

  const ranking = await getCurrentRanking(periodId);
  const allResults = ranking?.results ?? [];

  // Ambil semua pegawai pada 3 peringkat unik teratas (bukan 3 baris pertama),
  // agar pegawai yang seri pada suatu peringkat ikut terbawa seluruhnya.
  const topRanks = [...new Set(allResults.map((r) => r.rankPosition))]
    .sort((a, b) => a - b)
    .slice(0, 3);
  const top3 = allResults.filter((r) => topRanks.includes(r.rankPosition));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={backPath}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Pegawai Terbaik — {period.name}</h1>
        {period.finalizedAt && (
          <p className="text-sm text-muted-foreground">
            Disahkan{" "}
            {new Date(period.finalizedAt).toLocaleDateString("id-ID", {
              dateStyle: "long",
            })}
          </p>
        )}
      </div>

      {top3.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada data hasil.
          </CardContent>
        </Card>
      ) : (
        <PodiumTop3 results={top3} />
      )}
    </div>
  );
}
