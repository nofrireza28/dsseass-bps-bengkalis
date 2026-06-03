"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  Lock,
  TrendingUp,
  TrendingDown,
  Users,
  PenLine,
  CalendarDays,
  Calculator,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { createCriteriaAction, updateCriteriaAction } from "./action";

const FLOAT_TOLERANCE = 0.0001;

interface LeafFormProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    code: string;
    name: string;
    description: string;
    weight: number;
    type: "BENEFIT" | "COST";
    scoringMethod: "MULTI_RATER" | "MANUAL_INPUT";
    calculationType: string | null;
    isActive: boolean;
  };
  otherLeafWeight: number;
  isLocked: boolean;
  lockReason: string | null;
  hasFinalizedPeriods: boolean;
}

export function LeafForm({
  mode,
  initial,
  otherLeafWeight,
  isLocked,
  lockReason,
  hasFinalizedPeriods,
}: LeafFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? 0);
  const [type, setType] = useState<"BENEFIT" | "COST">(
    initial?.type ?? "BENEFIT",
  );
  const [scoringMethod, setScoringMethod] = useState<
    "MULTI_RATER" | "MANUAL_INPUT"
  >(initial?.scoringMethod ?? "MULTI_RATER");
  const [calculationType, setCalculationType] = useState<string>(
    initial?.calculationType ?? "DIRECT",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);

  const totalLeafWeight = weight + otherLeafWeight;
  const totalValid =
    !isActive || Math.abs(totalLeafWeight - 1.0) < FLOAT_TOLERANCE;

  const handleSubmit = () => {
    setError(null);

    if (isActive && !totalValid) {
      setError(
        `Total bobot leaf harus 100% (saat ini ${(totalLeafWeight * 100).toFixed(2)}%)`,
      );
      toast.error("Validasi gagal");
      return;
    }

    if (scoringMethod === "MANUAL_INPUT" && !calculationType) {
      setError("Metode kalkulasi wajib dipilih");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("weight", String(weight));
    formData.set("type", type);
    formData.set("scoringMethod", scoringMethod);
    if (scoringMethod === "MANUAL_INPUT") {
      formData.set("calculationType", calculationType);
    }
    formData.set("isActive", String(isActive));

    if (mode === "create") {
      formData.set("code", code);
      formData.set("isGroup", "false");
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCriteriaAction(formData)
          : await updateCriteriaAction(initial!.id, formData);

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Kriteria leaf berhasil dibuat"
            : "Kriteria berhasil diperbarui",
        );
        router.push("/admin/kriteria");
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menyimpan");
        toast.error(result.error ?? "Gagal menyimpan");
      }
    });
  };

  const title =
    mode === "create"
      ? "Tambah Kriteria LEAF"
      : `Edit Kriteria ${initial?.code}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={mode === "create" ? "/admin/kriteria/new" : "/admin/kriteria"}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            Kriteria yang dinilai langsung (tanpa sub-kriteria)
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-destructive">
              <p className="font-medium">Modifikasi Terkunci</p>
              <p className="mt-1">{lockReason}</p>
            </div>
          </div>
        </div>
      )}

      {!isLocked && hasFinalizedPeriods && mode === "edit" && (
        <div className="rounded-md border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-amber-900">
              <p className="font-medium">
                Perhatian: Ada Periode yang Sudah Disahkan
              </p>
              <p className="mt-1">
                Perubahan tidak akan mempengaruhi hasil ranking yang sudah
                disahkan (snapshot disimpan di{" "}
                <code className="text-xs bg-amber-100 px-1 rounded">
                  ranking_results
                </code>
                ).
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Info Dasar */}
        <Card>
          <CardHeader>
            <CardTitle>Info Kriteria Leaf</CardTitle>
            <CardDescription>
              Identitas dan bobot kriteria yang dinilai langsung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code">
                Kode <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) =>
                  mode === "create" && setCode(e.target.value.toUpperCase())
                }
                disabled={isPending || isLocked || mode === "edit"}
                className="font-mono uppercase"
                placeholder="CKP, ABS, dst"
                required
              />
              {mode === "edit" && (
                <p className="text-xs text-muted-foreground">
                  Kode tidak dapat diubah setelah dibuat
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending || isLocked}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending || isLocked}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">
                Bobot <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="weight"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="1"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  disabled={isPending || isLocked}
                  required
                  className="font-mono"
                />
                <Badge variant="outline" className="shrink-0">
                  = {(weight * 100).toFixed(2)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Bobot absolut, kontribusi langsung ke skor akhir
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Tipe <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(value: "BENEFIT" | "COST") => setType(value)}
                disabled={isPending || isLocked}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BENEFIT">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      BENEFIT (nilai tinggi = baik)
                    </div>
                  </SelectItem>
                  <SelectItem value="COST">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      COST (nilai rendah = baik)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
                disabled={isPending || isLocked}
              />
              <div className="flex-1">
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium cursor-pointer"
                >
                  Kriteria Aktif
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hanya kriteria aktif yang dipakai dalam perhitungan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metode Penilaian */}
        <Card>
          <CardHeader>
            <CardTitle>Metode Penilaian</CardTitle>
            <CardDescription>
              Bagaimana nilai kriteria ini diperoleh
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>
                Cara Penilaian <span className="text-destructive">*</span>
              </Label>
              <Select
                value={scoringMethod}
                onValueChange={(value: "MULTI_RATER" | "MANUAL_INPUT") =>
                  setScoringMethod(value)
                }
                disabled={isPending || isLocked}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTI_RATER">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Multi-Rater (penilaian rekan kerja)
                    </div>
                  </SelectItem>
                  <SelectItem value="MANUAL_INPUT">
                    <div className="flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-purple-600" />
                      Input Panitia (data objektif)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {scoringMethod === "MULTI_RATER"
                  ? "Nilai diperoleh dari rata-rata penilaian rekan kerja"
                  : "Nilai diinput langsung oleh panitia berdasarkan data objektif"}
              </p>
            </div>

            {scoringMethod === "MANUAL_INPUT" && (
              <div className="space-y-2">
                <Label>
                  Metode Kalkulasi <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={calculationType}
                  onValueChange={setCalculationType}
                  disabled={isPending || isLocked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT">
                      <div className="flex items-center gap-2">
                        <PenLine className="h-4 w-4" />
                        Input Nilai Langsung
                      </div>
                    </SelectItem>
                    <SelectItem value="MONTHLY_AVERAGE">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Rata-rata Nilai Bulanan
                      </div>
                    </SelectItem>
                    <SelectItem value="ABSENCE_THRESHOLD">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Konversi KJK (Absensi)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground space-y-1 mt-1">
                  {calculationType === "DIRECT" && (
                    <p>Admin menginput nilai final per pegawai (0-100)</p>
                  )}
                  {calculationType === "MONTHLY_AVERAGE" && (
                    <p>
                      Admin menginput nilai per bulan, sistem menghitung
                      rata-rata (cocok untuk CKP)
                    </p>
                  )}
                  {calculationType === "ABSENCE_THRESHOLD" && (
                    <p>
                      Admin menginput KJK menit per bulan, sistem konversi ke
                      nilai via threshold: 0→100, ≤50→90, ≤100→80, &gt;100→70
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Live total leaf summary */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                Ringkasan Bobot Leaf:
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Bobot kriteria ini:</span>
                  <span className="font-mono">
                    {(weight * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bobot leaf lain:</span>
                  <span className="font-mono">
                    {(otherLeafWeight * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total:</span>
                  <span
                    className={`font-mono ${
                      totalValid ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {(totalLeafWeight * 100).toFixed(2)}%
                    {totalValid ? " ✓" : " (harus 100%)"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isPending || isLocked || (isActive && !totalValid)}
          className="bg-bps-primary hover:bg-bps-primary/90"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : mode === "create" ? (
            "Buat Kriteria"
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/kriteria">Batal</Link>
        </Button>
      </div>
    </div>
  );
}
