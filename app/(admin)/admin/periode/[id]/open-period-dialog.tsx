"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { openPeriodAction } from "../action";
import type { PreOpenValidation } from "@/lib/period-validation-helpers";

interface Props {
  periodId: string;
  periodName: string;
  validation: PreOpenValidation;
}

export function OpenPeriodDialog({ periodId, periodName, validation }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await openPeriodAction(periodId);
      if (result.success) {
        toast.success(`Periode ${periodName} berhasil dibuka untuk penilaian`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal membuka periode");
      }
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-bps-primary hover:bg-bps-primary/90"
      >
        <Play className="mr-2 h-4 w-4" />
        Buka Periode
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buka Periode untuk Penilaian?</DialogTitle>
            <DialogDescription>
              Periode <strong>{periodName}</strong> akan dibuka dan matriks
              penilaian akan dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Checklist Validasi */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Checklist Validasi:
              </h4>
              <div className="space-y-2">
                {validation.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div
                        className={
                          check.passed ? "" : "text-destructive font-medium"
                        }
                      >
                        {check.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {check.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimasi Matrix - hanya kalau semua valid */}
            {validation.allPassed && (
              <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
                <div className="text-blue-900">
                  <div className="font-medium mb-2">
                    Records yang akan di-generate:
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Evaluations (multi-rater):</span>
                      <span className="font-mono font-medium">
                        {validation.matrixEstimate.multiRaterEvaluations}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Objective scores (CKP/ABSENSI):</span>
                      <span className="font-mono font-medium">
                        {validation.matrixEstimate.objectiveScores}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-1 font-medium mt-1">
                      <span>Total:</span>
                      <span className="font-mono">
                        {validation.matrixEstimate.total}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            {validation.allPassed && (
              <div className="rounded-md border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-amber-900">
                    <p className="font-medium">
                      Perhatian: Tindakan Ini Tidak Reversible
                    </p>
                    <p className="mt-1">Setelah periode dibuka:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                      <li>Daftar partisipan tidak dapat diubah</li>
                      <li>Detail periode tidak dapat diedit</li>
                      <li>Evaluator dapat mulai mengisi penilaian (Fase 5)</li>
                      <li>Admin dapat input data CKP/ABSENSI (Fase 5)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Error state kalau validasi gagal */}
            {!validation.allPassed && (
              <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="font-medium">
                  Periode belum siap dibuka. Lengkapi terlebih dahulu item yang
                  belum tercentang di atas.
                </p>
              </div>
            )}
          </div>

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
              disabled={isPending || !validation.allPassed}
              className="bg-bps-primary hover:bg-bps-primary/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuka...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Ya, Buka Periode
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
