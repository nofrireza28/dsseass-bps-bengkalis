"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Eye, Loader2, CheckCircle2, Circle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveObjectiveScoreAction } from "../actions";
import {
  calculateCkpScore,
  kjkToScore,
  type PeriodMonth,
  type ObjectiveRawData,
} from "@/lib/objective-calc";
import type { ObjectiveScoreRow } from "@/lib/objective-score-helpers";

interface Props {
  scores: ObjectiveScoreRow[];
  months: PeriodMonth[];
  calculationType: string | null;
  criteriaName: string;
  isReadOnly: boolean;
  periodStatus: string;
}

function fmtScore(s: string | null): string {
  return s !== null ? `${+parseFloat(s)}` : "—";
}

export function ObjectiveInputTable({
  scores,
  months,
  calculationType,
  criteriaName,
  isReadOnly,
  periodStatus,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<ObjectiveScoreRow | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isMonthly =
    calculationType === "MONTHLY_AVERAGE" ||
    calculationType === "ABSENCE_THRESHOLD";

  // Progress
  const filled = scores.filter((s) => s.finalScore !== null).length;
  const total = scores.length;
  const percentage = total === 0 ? 0 : Math.round((filled / total) * 100);

  function openDialog(score: ObjectiveScoreRow) {
    const init: Record<string, string> = {};
    if (calculationType === "MONTHLY_AVERAGE") {
      const ms = score.rawData?.monthlyScores ?? {};
      for (const m of months) {
        const v = ms[String(m.month)];
        init[String(m.month)] = v != null ? String(v) : "";
      }
    } else if (calculationType === "ABSENCE_THRESHOLD") {
      const mk = score.rawData?.monthlyKjk ?? {};
      for (const m of months) {
        const v = mk[String(m.month)];
        init[String(m.month)] = v != null ? String(v) : "";
      }
    } else if (calculationType === "DIRECT") {
      const d = score.rawData?.directScore;
      init["direct"] = d != null ? String(d) : (score.finalScore ?? "");
    }
    setInputs(init);
    setError(null);
    setSelected(score);
  }

  function handleInputChange(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  // Preview real-time
  const preview = useMemo(() => {
    if (calculationType === "MONTHLY_AVERAGE") {
      const ms: Record<string, number> = {};
      let allFilled = months.length > 0;
      for (const m of months) {
        const v = inputs[String(m.month)];
        if (v === "" || v == null || Number.isNaN(Number(v))) allFilled = false;
        else ms[String(m.month)] = Number(v);
      }
      if (!allFilled) return null;
      return { type: "ckp" as const, avg: calculateCkpScore(ms) };
    }
    if (calculationType === "ABSENCE_THRESHOLD") {
      let allFilled = months.length > 0;
      let totalKjk = 0;
      for (const m of months) {
        const v = inputs[String(m.month)];
        if (v === "" || v == null || Number.isNaN(Number(v))) allFilled = false;
        else totalKjk += Number(v);
      }
      if (!allFilled) return null;
      return {
        type: "abs" as const,
        total: totalKjk,
        score: kjkToScore(totalKjk),
      };
    }
    if (calculationType === "DIRECT") {
      const v = inputs["direct"];
      if (v === "" || v == null || Number.isNaN(Number(v))) return null;
      return { type: "direct" as const, score: Number(v) };
    }
    return null;
  }, [inputs, months, calculationType]);

  function handleSave() {
    if (!selected) return;
    setError(null);

    let rawData: ObjectiveRawData;
    if (calculationType === "MONTHLY_AVERAGE") {
      const ms: Record<string, number> = {};
      for (const m of months) {
        const v = inputs[String(m.month)];
        if (v === "" || v == null) {
          setError(`Nilai ${m.label} harus diisi`);
          return;
        }
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 100) {
          setError(`Nilai ${m.label} harus dalam rentang 0–100`);
          return;
        }
        ms[String(m.month)] = n;
      }
      rawData = { monthlyScores: ms };
    } else if (calculationType === "ABSENCE_THRESHOLD") {
      const mk: Record<string, number> = {};
      for (const m of months) {
        const v = inputs[String(m.month)];
        if (v === "" || v == null) {
          setError(`KJK ${m.label} harus diisi (isi 0 jika tidak ada)`);
          return;
        }
        const n = Number(v);
        if (Number.isNaN(n) || n < 0) {
          setError(`KJK ${m.label} tidak valid`);
          return;
        }
        mk[String(m.month)] = n;
      }
      rawData = { monthlyKjk: mk };
    } else if (calculationType === "DIRECT") {
      const v = inputs["direct"];
      const n = Number(v);
      if (v === "" || Number.isNaN(n) || n < 0 || n > 100) {
        setError("Nilai harus dalam rentang 0–100");
        return;
      }
      rawData = { directScore: n };
    } else {
      setError("Tipe kalkulasi tidak dikenal");
      return;
    }

    startTransition(async () => {
      const result = await saveObjectiveScoreAction(selected.id, rawData);
      if (result.success) {
        setSelected(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      {/* Read-only notice */}
      {isReadOnly && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Periode berstatus{" "}
            <span className="font-medium">{periodStatus}</span>. Nilai hanya
            dapat dilihat, tidak dapat diubah.
          </p>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all ${
                  percentage === 100 ? "bg-green-600" : "bg-blue-600"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums">
              {filled}/{total} ({percentage}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pegawai</TableHead>
                <TableHead className="text-center">Nilai Akhir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Belum ada pegawai untuk dinilai pada kriteria ini.
                  </TableCell>
                </TableRow>
              ) : (
                scores.map((s) => {
                  const isFilled = s.finalScore !== null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.employeeName}
                        {s.employeePosition && (
                          <div className="text-xs text-muted-foreground">
                            {s.employeePosition}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fmtScore(s.finalScore)}
                      </TableCell>
                      <TableCell>
                        {isFilled ? (
                          <Badge
                            variant="outline"
                            className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Terisi
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            <Circle className="mr-1 h-3 w-3" />
                            Belum
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(s)}
                        >
                          {isReadOnly ? (
                            <>
                              <Eye className="mr-1 h-3 w-3" />
                              Lihat
                            </>
                          ) : isFilled ? (
                            <>
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Pencil className="mr-1 h-3 w-3" />
                              Input
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog input/edit */}
      <Dialog
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isReadOnly ? "Detail" : "Input"} Nilai — {selected?.employeeName}
            </DialogTitle>
            <DialogDescription>{criteriaName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Field bulanan */}
            {isMonthly && (
              <div className="space-y-2">
                {months.map((m) => (
                  <div
                    key={m.month}
                    className="flex items-center justify-between gap-3"
                  >
                    <label htmlFor={`in-${m.month}`} className="text-sm">
                      {m.labelWithYear}
                    </label>
                    <Input
                      id={`in-${m.month}`}
                      type="number"
                      inputMode="numeric"
                      className="w-32 text-right"
                      value={inputs[String(m.month)] ?? ""}
                      onChange={(e) =>
                        handleInputChange(String(m.month), e.target.value)
                      }
                      disabled={isReadOnly}
                      min={0}
                      max={
                        calculationType === "MONTHLY_AVERAGE" ? 100 : undefined
                      }
                      placeholder={
                        calculationType === "ABSENCE_THRESHOLD"
                          ? "menit"
                          : "0–100"
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Field direct */}
            {calculationType === "DIRECT" && (
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="in-direct" className="text-sm">
                  Nilai Akhir
                </label>
                <Input
                  id="in-direct"
                  type="number"
                  inputMode="numeric"
                  className="w-32 text-right"
                  value={inputs["direct"] ?? ""}
                  onChange={(e) => handleInputChange("direct", e.target.value)}
                  disabled={isReadOnly}
                  min={0}
                  max={100}
                  placeholder="0–100"
                />
              </div>
            )}

            {/* Preview auto-calc */}
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              {preview === null ? (
                <span className="text-muted-foreground">
                  Isi semua field untuk melihat nilai akhir.
                </span>
              ) : preview.type === "ckp" ? (
                <div className="flex items-center justify-between">
                  <span>Rata-rata (Nilai Akhir):</span>
                  <span className="text-base font-bold">{preview.avg}</span>
                </div>
              ) : preview.type === "abs" ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Total KJK:</span>
                    <span>{preview.total} menit</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nilai Akhir (threshold):</span>
                    <span className="text-base font-bold">{preview.score}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>Nilai Akhir:</span>
                  <span className="text-base font-bold">{preview.score}</span>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={isPending}
            >
              {isReadOnly ? "Tutup" : "Batal"}
            </Button>
            {!isReadOnly && (
              <Button
                onClick={handleSave}
                disabled={isPending || preview === null}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
