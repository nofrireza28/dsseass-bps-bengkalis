"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calculator,
  Loader2,
  Eye,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateRankingAction } from "./action";
import type { CurrentRanking, RankingResultRow } from "@/lib/ranking-helpers";

interface Props {
  periodId: string;
  periodStatus: string;
  ranking: CurrentRanking | null;
}

export function RankingView({ periodId, periodStatus, ranking }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [detail, setDetail] = useState<RankingResultRow | null>(null);

  const canCalculate = periodStatus === "CLOSED";
  const hasRanking = ranking !== null;
  const metaCriteria = ranking?.calculation.metadata?.criteria ?? [];

  function handleCalculate() {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const res = await calculateRankingAction(periodId);
      if (res.success) {
        if (res.warning) setWarning(res.warning);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      {/* Aksi hitung */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {hasRanking
              ? `Dihitung ${new Date(
                  ranking.calculation.calculatedAt,
                ).toLocaleString("id-ID")}${
                  ranking.calculation.calculatedByName
                    ? ` oleh ${ranking.calculation.calculatedByName}`
                    : ""
                }.`
              : "Ranking belum dihitung untuk periode ini."}
          </p>
          {canCalculate ? (
            <Button onClick={handleCalculate} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : hasRanking ? (
                <RefreshCw className="mr-2 h-4 w-4" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              {hasRanking ? "Hitung Ulang" : "Hitung Ranking"}
            </Button>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              {periodStatus === "OPEN" || periodStatus === "DRAFT"
                ? "Tutup periode dulu untuk menghitung"
                : "Periode terkunci"}
            </Badge>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Hasil */}
      {!hasRanking ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada hasil ranking.
            {canCalculate && ' Klik "Hitung Ranking" untuk memulai.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Peringkat Pegawai</CardTitle>
            <CardDescription>
              {ranking.results.length} pegawai · metode SAW (normalisasi max
              kolom)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-center">Penilai</TableHead>
                  <TableHead className="text-right">Nilai (V)</TableHead>
                  <TableHead className="text-right">Rincian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.results.map((r) => (
                  <TableRow
                    key={r.employeeId}
                    className={
                      r.rankPosition === 1
                        ? "bg-amber-50 dark:bg-amber-950/20"
                        : ""
                    }
                  >
                    <TableCell className="text-center font-bold">
                      {r.rankPosition === 1 ? (
                        <Trophy className="mx-auto h-4 w-4 text-amber-500" />
                      ) : (
                        r.rankPosition
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.employeeName}
                      {r.employeePosition && (
                        <div className="text-xs text-muted-foreground">
                          {r.employeePosition}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {r.totalEvaluators}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {(+parseFloat(r.finalScore)).toFixed(6)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetail(r)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog rincian SAW per pegawai (transparansi) */}
      <Dialog
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Rincian Perhitungan SAW — {detail?.employeeName}
            </DialogTitle>
            <DialogDescription>
              Peringkat #{detail?.rankPosition} · V ={" "}
              {detail ? (+parseFloat(detail.finalScore)).toFixed(6) : ""}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kriteria</TableHead>
                    <TableHead className="text-right">Nilai (x)</TableHead>
                    <TableHead className="text-right">Norm (r)</TableHead>
                    <TableHead className="text-right">Bobot (w)</TableHead>
                    <TableHead className="text-right">w·r</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metaCriteria.map((c) => {
                    const x = detail.aggregatedScores[c.id] ?? 0;
                    const r = detail.normalizedScores[c.id] ?? 0;
                    const w = c.normalizedWeight;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          {c.name}
                          <div className="text-xs text-muted-foreground">
                            {c.code}
                            {c.type === "COST" ? " · cost" : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {+x.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {w.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(w * r).toFixed(6)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-2 flex justify-end gap-2 border-t pt-3 text-sm font-bold">
                <span>Total V =</span>
                <span className="font-mono">
                  {(+parseFloat(detail.finalScore)).toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
