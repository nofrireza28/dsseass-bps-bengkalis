"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveScoreAction, submitEvaluationAction } from "../action";
import type { SubCriteriaGrouped } from "@/lib/evaluation-helpers";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EvaluationFormProps {
  id: string;
  evaluateeName: string;
  evaluateePosition: string | null;
  periodName: string;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: Date | null;
  isReadOnly: boolean;
  subCriteriaGroups: SubCriteriaGrouped[];
  initialScores: Record<string, string>;
  totalSubCriteria: number;
}

export function EvaluationForm({
  id,
  evaluateeName,
  evaluateePosition,
  periodName,
  status,
  submittedAt,
  isReadOnly,
  subCriteriaGroups,
  initialScores,
  totalSubCriteria,
}: EvaluationFormProps) {
  const router = useRouter();
  const [isSubmitting, startSubmit] = useTransition();

  // State: nilai input (string) per subCriteriaId
  const [scores, setScores] = useState<Record<string, string>>(initialScores);
  // State: nilai yang sudah benar-benar tersimpan di DB
  const [savedScores, setSavedScores] =
    useState<Record<string, string>>(initialScores);
  // State: status save per field
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  // State: error per field
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>(
    {},
  );
  // State: error submit
  const [submitError, setSubmitError] = useState<string | null>(null);
  // State: dialog konfirmasi
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Derived: berapa field sudah terisi valid (dari savedScores)
  const filledCount = useMemo(() => {
    return Object.values(savedScores).filter(
      (v) => v != null && v.toString().trim() !== "",
    ).length;
  }, [savedScores]);

  const allFilled = filledCount >= totalSubCriteria;
  const anySaving = Object.values(saveStatus).some((s) => s === "saving");
  const canSubmit =
    allFilled && !anySaving && status === "DRAFT" && !isReadOnly;

  // Handler: ubah nilai input
  function handleChange(subCriteriaId: string, value: string) {
    setScores((prev) => ({ ...prev, [subCriteriaId]: value }));
    // Reset status saat user mulai ngetik lagi
    setSaveStatus((prev) => ({ ...prev, [subCriteriaId]: "idle" }));
    setFieldErrors((prev) => ({ ...prev, [subCriteriaId]: null }));
  }

  // Handler: auto-save saat blur
  async function handleBlur(subCriteriaId: string) {
    if (isReadOnly) return;

    const rawValue = scores[subCriteriaId];

    // Skip kalau kosong
    if (rawValue == null || rawValue.toString().trim() === "") return;

    const numValue = Number(rawValue);

    // Validasi range 60–100
    if (Number.isNaN(numValue) || numValue < 60 || numValue > 100) {
      setFieldErrors((prev) => ({
        ...prev,
        [subCriteriaId]: "Nilai harus antara 60–100",
      }));
      setSaveStatus((prev) => ({ ...prev, [subCriteriaId]: "error" }));
      return;
    }

    // Skip kalau tidak berubah dari yang sudah tersimpan
    if (rawValue.toString() === (savedScores[subCriteriaId] ?? "").toString()) {
      setSaveStatus((prev) => ({ ...prev, [subCriteriaId]: "saved" }));
      return;
    }

    // Save
    setSaveStatus((prev) => ({ ...prev, [subCriteriaId]: "saving" }));
    setFieldErrors((prev) => ({ ...prev, [subCriteriaId]: null }));

    const result = await saveScoreAction(id, subCriteriaId, numValue);

    if (result.success) {
      setSaveStatus((prev) => ({ ...prev, [subCriteriaId]: "saved" }));
      setSavedScores((prev) => ({
        ...prev,
        [subCriteriaId]: rawValue.toString(),
      }));
    } else {
      setSaveStatus((prev) => ({ ...prev, [subCriteriaId]: "error" }));
      setFieldErrors((prev) => ({ ...prev, [subCriteriaId]: result.error }));
    }
  }

  // Handler: submit
  function handleSubmit() {
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitEvaluationAction(id);
      if (result.success) {
        setConfirmOpen(false);
        router.push("/pegawai/penilaian");
        router.refresh();
      } else {
        setSubmitError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/pegawai/penilaian">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Daftar
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{evaluateeName}</h1>
            {evaluateePosition && (
              <p className="text-sm text-muted-foreground">
                {evaluateePosition}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Periode: {periodName}
            </p>
          </div>
          {status === "SUBMITTED" && (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Selesai
            </Badge>
          )}
        </div>
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 p-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-muted-foreground">
            {status === "SUBMITTED" ? (
              <>
                <p className="font-medium text-foreground">
                  Penilaian sudah ditandai selesai
                </p>
                <p className="mt-0.5 text-xs">
                  {submittedAt &&
                    `Diselesaikan pada ${new Date(submittedAt).toLocaleString(
                      "id-ID",
                      { dateStyle: "long", timeStyle: "short" },
                    )}. `}
                  Untuk perbaikan, hubungi admin agar membuka kembali penilaian
                  ini.
                </p>
              </>
            ) : (
              <p>
                Periode penilaian tidak lagi terbuka. Penilaian tidak dapat
                diubah.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress indikator */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 rounded-md border bg-card p-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all ${
                allFilled ? "bg-green-600" : "bg-blue-600"
              }`}
              style={{
                width: `${Math.round((filledCount / totalSubCriteria) * 100)}%`,
              }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums">
            {filledCount}/{totalSubCriteria}
          </span>
        </div>
      )}

      {/* Form groups per criteria */}
      {subCriteriaGroups.map((group) => (
        <Card key={group.criteriaId}>
          <CardHeader>
            <CardTitle className="text-base">
              {group.criteriaName}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({group.criteriaCode})
              </span>
            </CardTitle>
            {group.criteriaDescription && (
              <CardDescription>{group.criteriaDescription}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {group.subCriteria.map((sub) => {
              const fieldStatus = saveStatus[sub.id] ?? "idle";
              const fieldError = fieldErrors[sub.id];
              return (
                <div key={sub.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`score-${sub.id}`}
                        className="text-sm font-medium"
                      >
                        {sub.name}
                      </label>
                      {sub.description && (
                        <p className="text-xs text-muted-foreground">
                          {sub.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        id={`score-${sub.id}`}
                        type="number"
                        min={60}
                        max={100}
                        step={1}
                        inputMode="numeric"
                        className="w-24 text-right"
                        value={scores[sub.id] ?? ""}
                        onChange={(e) => handleChange(sub.id, e.target.value)}
                        onBlur={() => handleBlur(sub.id)}
                        disabled={isReadOnly}
                        placeholder="60-100"
                      />
                      {/* Save indicator */}
                      <div className="w-5 shrink-0">
                        {fieldStatus === "saving" && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {fieldStatus === "saved" && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {fieldStatus === "error" && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  {fieldError && (
                    <p className="text-right text-xs text-red-600">
                      {fieldError}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Submit area */}
      {!isReadOnly && (
        <div className="sticky bottom-4 rounded-lg border bg-card p-4 shadow-lg">
          {submitError && (
            <p className="mb-3 text-sm text-red-600">{submitError}</p>
          )}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {allFilled
                ? "Semua sub-kriteria sudah terisi."
                : `Terisi ${filledCount} dari ${totalSubCriteria} sub-kriteria.`}
            </p>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canSubmit}>Tandai Selesai</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tandai Penilaian Selesai?</DialogTitle>
                  <DialogDescription>
                    Setelah ditandai selesai, penilaian untuk{" "}
                    <span className="font-medium">{evaluateeName}</span> tidak
                    dapat diubah lagi. Pastikan semua nilai sudah benar.
                  </DialogDescription>
                </DialogHeader>
                {submitError && (
                  <p className="text-sm text-red-600">{submitError}</p>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Ya, Tandai Selesai
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
