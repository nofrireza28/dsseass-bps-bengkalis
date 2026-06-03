"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Info, Wand2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

import { createPeriodAction, updatePeriodAction } from "./action";
import {
  PERIOD_TYPES,
  PERIOD_TYPE_LABELS,
  MONTH_NAMES,
  calculateDefaultDates,
  generateDefaultName,
  type PeriodType,
} from "@/lib/period-constants";

interface PeriodFormProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    periodType: string;
    year: number;
    periodIndex: number | null;
    description: string;
    startDate: string;
    endDate: string;
  };
}

const QUARTER_LABELS = [
  { value: 1, label: "Triwulan I (Jan – Mar)" },
  { value: 2, label: "Triwulan II (Apr – Jun)" },
  { value: 3, label: "Triwulan III (Jul – Sep)" },
  { value: 4, label: "Triwulan IV (Okt – Des)" },
];

const SEMESTER_LABELS = [
  { value: 1, label: "Semester 1 (Jan – Jun)" },
  { value: 2, label: "Semester 2 (Jul – Des)" },
];

function getPeriodIndexOptions(periodType: PeriodType) {
  switch (periodType) {
    case "MONTHLY":
      return MONTH_NAMES.map((label, i) => ({ value: i + 1, label }));
    case "QUARTERLY":
      return QUARTER_LABELS;
    case "SEMESTER":
      return SEMESTER_LABELS;
    default:
      return [];
  }
}

function getPeriodIndexLabel(periodType: PeriodType): string {
  switch (periodType) {
    case "MONTHLY":
      return "Bulan";
    case "QUARTERLY":
      return "Triwulan";
    case "SEMESTER":
      return "Semester";
    default:
      return "";
  }
}

function typeNeedsIndex(type: PeriodType): boolean {
  return type === "MONTHLY" || type === "QUARTERLY" || type === "SEMESTER";
}

export function PeriodForm({ mode, initial }: PeriodFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // Form state
  const [periodType, setPeriodType] = useState<PeriodType>(
    (initial?.periodType as PeriodType) ?? "QUARTERLY",
  );
  const [year, setYear] = useState<number>(initial?.year ?? currentYear);
  const [periodIndex, setPeriodIndex] = useState<number | null>(
    initial?.periodIndex ?? null,
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  // Hanya untuk create mode - apakah otomatis tambahkan semua pegawai aktif?
  const [addAllActiveEmployees, setAddAllActiveEmployees] = useState(true);

  // Year options: currentYear - 1 sampai currentYear + 3
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  // Conditional behavior: ANNUAL/CUSTOM tidak butuh periodIndex
  const needsPeriodIndex = typeNeedsIndex(periodType);
  const periodIndexOptions = getPeriodIndexOptions(periodType);
  const periodIndexLabel = getPeriodIndexLabel(periodType);

  // Helper: auto-fill nama & tanggal kalau masih kosong (tidak overwrite user input)
  const autoFillIfEmpty = (
    type: PeriodType,
    yr: number,
    idx: number | null,
  ) => {
    if (type === "CUSTOM") return;

    // Auto-fill name kalau kosong
    setName((prev) => {
      if (prev) return prev;
      return generateDefaultName(type, yr, idx) || prev;
    });

    // Auto-fill dates kalau keduanya kosong
    const dates = calculateDefaultDates(type, yr, idx);
    if (dates) {
      setStartDate((prev) => prev || dates.start);
      setEndDate((prev) => prev || dates.end);
    }
  };

  const handlePeriodTypeChange = (newType: PeriodType) => {
    setPeriodType(newType);

    // Tipe baru tidak butuh index → reset periodIndex
    const newNeedsIndex = typeNeedsIndex(newType);
    const newIndex = newNeedsIndex ? periodIndex : null;
    if (!newNeedsIndex) {
      setPeriodIndex(null);
    }

    autoFillIfEmpty(newType, year, newIndex);
  };

  const handleYearChange = (newYearStr: string) => {
    const newYear = parseInt(newYearStr);
    setYear(newYear);
    autoFillIfEmpty(periodType, newYear, periodIndex);
  };

  const handlePeriodIndexChange = (newIndexStr: string) => {
    const newIndex = parseInt(newIndexStr);
    setPeriodIndex(newIndex);
    autoFillIfEmpty(periodType, year, newIndex);
  };

  // Auto-fill handler (dipanggil manual via tombol)
  const handleAutoFill = () => {
    const autoName = generateDefaultName(periodType, year, periodIndex);
    if (autoName) setName(autoName);

    const dates = calculateDefaultDates(periodType, year, periodIndex);
    if (dates) {
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  };

  const handleSubmit = () => {
    setError(null);

    // Validasi client-side
    if (name.length < 3) {
      setError("Nama minimal 3 karakter");
      toast.error("Validasi gagal");
      return;
    }
    if (needsPeriodIndex && !periodIndex) {
      setError(
        `${periodIndexLabel} wajib dipilih untuk tipe ${PERIOD_TYPE_LABELS[periodType]}`,
      );
      toast.error("Validasi gagal");
      return;
    }
    if (!startDate || !endDate) {
      setError("Tanggal mulai dan akhir wajib diisi");
      toast.error("Validasi gagal");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("Tanggal akhir harus setelah tanggal mulai");
      toast.error("Validasi gagal");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("periodType", periodType);
    formData.set("year", String(year));
    if (periodIndex !== null) {
      formData.set("periodIndex", String(periodIndex));
    }
    formData.set("description", description);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);

    if (mode === "create") {
      formData.set("addAllActiveEmployees", String(addAllActiveEmployees));
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPeriodAction(formData)
          : await updatePeriodAction(initial!.id, formData);

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Periode berhasil dibuat"
            : "Periode berhasil diperbarui",
        );
        router.push(
          mode === "create" && result.periodId
            ? `/admin/periode/${result.periodId}`
            : "/admin/periode",
        );
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menyimpan");
        toast.error(result.error ?? "Gagal menyimpan");
      }
    });
  };

  const title = mode === "create" ? "Buat Periode Baru" : `Edit Periode`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/periode">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            Setelah dibuat, periode akan berstatus DRAFT — bisa diedit sebelum
            dibuka
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-blue-900">
            Pilih tipe periode lalu sesuaikan detailnya. Tombol{" "}
            <strong>Auto-fill</strong> akan mengisi ulang nama dan tanggal
            sesuai pilihan tipe.
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identifikasi Periode</CardTitle>
          <CardDescription>
            Tipe periode menentukan field apa yang muncul di bawah
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tipe Periode */}
          <div className="space-y-2">
            <Label>
              Tipe Periode <span className="text-destructive">*</span>
            </Label>
            <Select
              value={periodType}
              onValueChange={handlePeriodTypeChange}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PERIOD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tahun & Period Index dalam 1 row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Tahun <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(year)}
                onValueChange={handleYearChange}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsPeriodIndex && (
              <div className="space-y-2">
                <Label>
                  {periodIndexLabel} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={periodIndex !== null ? String(periodIndex) : ""}
                  onValueChange={handlePeriodIndexChange}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Pilih ${periodIndexLabel.toLowerCase()}...`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {periodIndexOptions.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Auto-fill button */}
          {periodType !== "CUSTOM" && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFill}
                disabled={isPending || (needsPeriodIndex && !periodIndex)}
              >
                <Wand2 className="mr-2 h-3 w-3" />
                Auto-fill Nama & Tanggal
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Akan mengisi ulang nama dan tanggal berdasarkan tipe + tahun +
                index
              </p>
            </div>
          )}

          {/* Nama */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama Periode <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
              placeholder={
                periodType === "CUSTOM"
                  ? "Misal: Evaluasi Khusus Sensus 2025"
                  : "Akan terisi otomatis..."
              }
            />
            <p className="text-xs text-muted-foreground">
              {periodType === "CUSTOM"
                ? "Isi sesuai konteks periode"
                : "Boleh diubah dari nama default"}
            </p>
          </div>

          {/* Deskripsi */}
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={2}
              placeholder="Catatan tambahan tentang periode (opsional)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tanggal Penilaian</CardTitle>
          <CardDescription>
            Rentang tanggal saat penilaian aktif dilakukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Tanggal Mulai <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">
                Tanggal Akhir <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending}
                required
                min={startDate || undefined}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Partisipan Awal
            </CardTitle>
            <CardDescription>
              Tentukan apakah semua pegawai aktif langsung dimasukkan sebagai
              partisipan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="addAllActiveEmployees"
                checked={addAllActiveEmployees}
                onCheckedChange={(c) => setAddAllActiveEmployees(c === true)}
                disabled={isPending}
              />
              <div className="flex-1">
                <label
                  htmlFor="addAllActiveEmployees"
                  className="text-sm font-medium cursor-pointer"
                >
                  Tambahkan semua pegawai aktif sebagai partisipan
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Default: semua pegawai aktif akan ditambahkan sebagai{" "}
                  <strong>evaluator</strong> dan <strong>evaluatee</strong>.
                  Daftar partisipan masih dapat diubah setelah periode dibuat
                  (selama status masih DRAFT).
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Jika tidak dicentang, periode akan dibuat tanpa partisipan —
                  admin perlu menambahkan secara manual.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {error && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-bps-primary hover:bg-bps-primary/90"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : mode === "create" ? (
            "Buat Periode"
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/periode">Batal</Link>
        </Button>
      </div>
    </div>
  );
}
