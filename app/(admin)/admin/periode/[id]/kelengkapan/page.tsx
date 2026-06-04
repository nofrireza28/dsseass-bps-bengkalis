import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPeriodCompletionStats } from "@/lib/period-completion-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KelengkapanPage({ params }: PageProps) {
  const { id: periodId } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, periodId),
  });

  if (!period) {
    notFound();
  }

  const stats = await getPeriodCompletionStats(periodId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        
          {/* <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href={`/admin/periode/${periodId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Kembali ke Detail Periode
            </Link>
          </Button> */}
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/periode/${periodId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Kelengkapan</h1>
          <p className="text-sm text-muted-foreground">{period.name}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Penilaian Subjektif</CardDescription>
            <CardTitle className="text-3xl">
              {stats.subjectivePercentage}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.submittedEvaluations} dari {stats.totalEvaluations}{" "}
              evaluasi SUBMITTED
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sisa DRAFT: {stats.draftEvaluations}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Penilaian Objektif</CardDescription>
            <CardTitle className="text-3xl">
              {stats.objectivePercentage}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.filledObjectiveScores} dari {stats.totalObjectiveScores}{" "}
              record terisi
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sisa kosong: {stats.emptyObjectiveScores}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subjektif breakdown per evaluator */}
      <Card>
        <CardHeader>
          <CardTitle>Progres per Evaluator</CardTitle>
          <CardDescription>
            Status pengisian penilaian subjektif untuk setiap evaluator.
            Evaluator yang tidak dapat menyelesaikan kewajibannya (sakit keras,
            mutasi, dsb) dapat dikecualikan melalui menu Partisipan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.evaluatorProgress.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada data evaluator.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Evaluator</TableHead>
                  <TableHead className="text-center">Selesai</TableHead>
                  <TableHead className="text-center">Belum</TableHead>
                  <TableHead className="w-[50]">Progres</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.evaluatorProgress.map((ev) => (
                  <TableRow key={ev.evaluatorId}>
                    <TableCell className="font-medium">
                      {ev.evaluatorName}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {ev.submitted}/{ev.totalAssigned}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {ev.draft}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full transition-all ${
                              ev.isComplete
                                ? "bg-green-600"
                                : ev.percentage > 0
                                  ? "bg-blue-600"
                                  : "bg-gray-400"
                            }`}
                            style={{ width: `${ev.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                          {ev.percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ev.isComplete ? (
                        <Badge
                          variant="outline"
                          className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Selesai
                        </Badge>
                      ) : ev.percentage > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          Sebagian
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Belum Mulai
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/periode/${periodId}/partisipan`}>
                Kelola Partisipan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Objektif breakdown per kriteria */}
      <Card>
        <CardHeader>
          <CardTitle>Progres per Kriteria Objektif</CardTitle>
          <CardDescription>
            Status pengisian penilaian objektif (manual-input oleh admin) per
            kriteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.criteriaProgress.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada kriteria objektif untuk periode ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kriteria</TableHead>
                  <TableHead className="text-center">Terisi</TableHead>
                  <TableHead className="text-center">Kosong</TableHead>
                  <TableHead className="w-[50]">Progres</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.criteriaProgress.map((c) => (
                  <TableRow key={c.criteriaId}>
                    <TableCell>
                      <div className="font-medium">{c.criteriaName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.criteriaCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {c.filled}/{c.totalRecords}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {c.empty}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full transition-all ${
                              c.isComplete
                                ? "bg-green-600"
                                : c.percentage > 0
                                  ? "bg-blue-600"
                                  : "bg-gray-400"
                            }`}
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                          {c.percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.isComplete ? (
                        <Badge
                          variant="outline"
                          className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Selesai
                        </Badge>
                      ) : c.percentage > 0 ? (
                        <Badge variant="outline">
                          <Clock className="mr-1 h-3 w-3" />
                          Sebagian
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="mr-1 h-3 w-3" />
                          Belum
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
