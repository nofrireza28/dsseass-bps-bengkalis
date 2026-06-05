import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Calculator,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { getObjectiveCriteriaWithProgress } from "@/lib/objective-score-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

const CALC_TYPE_LABEL: Record<string, string> = {
  MONTHLY_AVERAGE: "Rata-rata nilai bulanan",
  ABSENCE_THRESHOLD: "Akumulasi KJK → threshold",
  DIRECT: "Input nilai langsung",
};

function formatWeight(weight: string): string {
  return `${+(parseFloat(weight) * 100).toFixed(2)}%`;
}

export default async function PenilaianObjektifPage({ params }: PageProps) {
  const { id: periodId } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });
  if (!period) notFound();

  const criteriaList = await getObjectiveCriteriaWithProgress(periodId);
  const isOpen = period.status === "OPEN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/admin/periode/${periodId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Detail Periode
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Penilaian Objektif</h1>
        <p className="text-sm text-muted-foreground">
          {period.name} — input nilai CKP &amp; Absensi berdasarkan data dari
          sistem kepegawaian dan rekap absensi.
        </p>
      </div>

      {/* Notice kalau bukan OPEN */}
      {!isOpen && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Periode berstatus{" "}
            <span className="font-medium">{period.status}</span>. Nilai objektif
            hanya dapat diinput saat periode OPEN. Halaman ini kini baca-saja.
          </p>
        </div>
      )}

      {/* Cards kriteria */}
      {criteriaList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada kriteria objektif untuk periode ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {criteriaList.map((c) => (
            <Card key={c.criteriaId}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription>
                      {c.code} · Bobot {formatWeight(c.weight)}
                    </CardDescription>
                  </div>
                  {c.isComplete && (
                    <Badge
                      variant="outline"
                      className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Lengkap
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calculator className="h-3.5 w-3.5" />
                  {CALC_TYPE_LABEL[c.calculationType ?? ""] ??
                    c.calculationType ??
                    "—"}
                </p>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pengisian</span>
                    <span className="font-medium tabular-nums">
                      {c.filled}/{c.totalRecords} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full transition-all ${
                        c.isComplete ? "bg-green-600" : "bg-blue-600"
                      }`}
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full"
                  variant={isOpen ? "default" : "outline"}
                >
                  <Link
                    href={`/admin/periode/${periodId}/penilaian-objektif/${c.criteriaId}`}
                  >
                    {isOpen ? "Input Nilai" : "Lihat Data"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
