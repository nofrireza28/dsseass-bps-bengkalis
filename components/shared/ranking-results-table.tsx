"use client";

import { useState } from "react";
import { Trophy, Eye } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RankingResultRow, RankingMetadata } from "@/lib/ranking-helpers";

interface Props {
  results: RankingResultRow[];
  metaCriteria: RankingMetadata["criteria"];
  title?: string;
  description?: string;
}

export function RankingResultsTable({
  results,
  metaCriteria,
  title = "Peringkat Pegawai",
  description,
}: Props) {
  const [detail, setDetail] = useState<RankingResultRow | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description ??
            `${results.length} pegawai · metode SAW (normalisasi max kolom)`}
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
            {results.map((r) => (
              <TableRow
                key={r.employeeId}
                className={
                  r.rankPosition === 1 ? "bg-amber-50 dark:bg-amber-950/20" : ""
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
    </Card>
  );
}
