"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { closePeriodAction } from "../action";
import type { PreCloseValidation } from "@/lib/period-validation-helpers";

interface ClosePeriodDialogProps {
  periodId: string;
  validation: PreCloseValidation;
}

export function ClosePeriodDialog({
  periodId,
  validation,
}: ClosePeriodDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { allPassed, checks, stats } = validation;

  function handleConfirm() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await closePeriodAction(periodId);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={allPassed ? "default" : "outline"}
          disabled={!allPassed}
        >
          Tutup Periode
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tutup Periode Penilaian</DialogTitle>
          <DialogDescription>
            Periksa kelengkapan sebelum menutup. Setelah ditutup, data
            penilaian terkunci dan tidak dapat diubah.
          </DialogDescription>
        </DialogHeader>

        {/* Checklist */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Checklist Validasi:</p>
          <ul className="space-y-2">
            {checks.map((check, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div className="flex-1">
                  <p className={check.passed ? "" : "text-red-700"}>
                    {check.label}
                  </p>
                  {check.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {check.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary stats */}
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Ringkasan Kelengkapan:</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Subjektif:</span>{" "}
              <span className="font-medium">
                {stats.submittedEvaluations}/{stats.totalEvaluations} (
                {stats.subjectivePercentage}%)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Objektif:</span>{" "}
              <span className="font-medium">
                {stats.filledObjectiveScores}/{stats.totalObjectiveScores} (
                {stats.objectivePercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Warning */}
        {allPassed && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div className="text-yellow-900 dark:text-yellow-200">
              <p className="font-medium">Aksi ini tidak dapat dibatalkan</p>
              <p className="mt-0.5 text-xs">
                Setelah CLOSED, evaluator tidak dapat lagi mengubah penilaian
                dan admin tidak dapat menginput data objektif.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allPassed || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ya, Tutup Periode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}