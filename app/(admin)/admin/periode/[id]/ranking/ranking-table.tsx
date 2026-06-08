"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Send,
  Clock,
  CheckCircle2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RankingResultsTable } from "@/components/shared/ranking-results-table";
import { calculateRankingAction, submitForApprovalAction } from "./action";
import type { CurrentRanking } from "@/lib/ranking-helpers";

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

  const [showSubmit, setShowSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

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

  function handleSubmit() {
    setSubmitError(null);
    startSubmit(async () => {
      const res = await submitForApprovalAction(periodId);
      if (res.success) {
        setShowSubmit(false);
        router.refresh();
      } else {
        setSubmitError(res.error);
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

      {/* Hasil ranking (komponen bersama) */}
      {!hasRanking ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada hasil ranking.
            {canCalculate && ' Klik "Hitung Ranking" untuk memulai.'}
          </CardContent>
        </Card>
      ) : (
        <RankingResultsTable
          results={ranking.results}
          metaCriteria={metaCriteria}
        />
      )}

      {/* Ajukan pengesahan */}
      {hasRanking && periodStatus === "CLOSED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajukan Pengesahan</CardTitle>
            <CardDescription>
              Jika hasil ranking sudah sesuai, ajukan ke Pimpinan untuk
              disahkan. Setelah diajukan, periode terkunci dan ranking tidak
              dapat dihitung ulang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowSubmit(true)} disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              Submit untuk Pengesahan
            </Button>
          </CardContent>
        </Card>
      )}

      {periodStatus === "AWAITING_APPROVAL" && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Periode ini telah diajukan dan sedang menunggu pengesahan Pimpinan.
          </span>
        </div>
      )}
      {periodStatus === "FINALIZED" && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Hasil ranking periode ini telah disahkan oleh Pimpinan.</span>
        </div>
      )}

      {/* Dialog konfirmasi submit */}
      <Dialog
        open={showSubmit}
        onOpenChange={(o) => !o && setShowSubmit(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit untuk Pengesahan?</DialogTitle>
            <DialogDescription>
              Periode akan dikunci dan dikirim ke Pimpinan untuk disahkan.
              Ranking tidak dapat dihitung ulang setelah ini. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmit(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Ya, Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
