"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Info,
  Lock,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
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

import { updateCriteriaAction } from "../../action";

interface CriteriaInput {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number;
  hasSubCriteria: boolean;
  isActive: boolean;
}

interface SubCriteriaInput {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number;
  type: "BENEFIT" | "COST";
}

interface SubCriteriaState extends SubCriteriaInput {
  isNew: boolean;
  markedForDeletion: boolean;
}

interface CriteriaEditFormProps {
  criteria: CriteriaInput;
  subCriteria: SubCriteriaInput[];
  isLocked: boolean;
  lockReason: string | null;
  hasFinalizedPeriods: boolean;
}

const FLOAT_TOLERANCE = 0.0001;

export function CriteriaEditForm({
  criteria,
  subCriteria: initialSubs,
  isLocked,
  lockReason,
  hasFinalizedPeriods,
}: CriteriaEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(criteria.name);
  const [description, setDescription] = useState(criteria.description);
  const [weight, setWeight] = useState(criteria.weight);
  const [isActive, setIsActive] = useState(criteria.isActive);

  // Sub-kriteria dengan flag isNew & markedForDeletion
  const [subs, setSubs] = useState<SubCriteriaState[]>(
    initialSubs.map((s) => ({ ...s, isNew: false, markedForDeletion: false })),
  );

  // Active subs (yang tidak ditandai untuk dihapus)
  const activeSubs = useMemo(
    () => subs.filter((s) => !s.markedForDeletion),
    [subs],
  );

  const subTotalWeight = useMemo(
    () => activeSubs.reduce((sum, s) => sum + (Number(s.weight) || 0), 0),
    [activeSubs],
  );
  const subWeightValid = Math.abs(subTotalWeight - 1.0) < FLOAT_TOLERANCE;

  const handleSubChange = (
    index: number,
    field: keyof SubCriteriaInput,
    value: string | number,
  ) => {
    setSubs((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              [field]:
                field === "weight" ? parseFloat(String(value)) || 0 : value,
            }
          : s,
      ),
    );
  };

  const handleAddSub = () => {
    const existingSubs = subs.filter((s) => !s.markedForDeletion);
    const nextNum = existingSubs.length + 1;
    setSubs((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        code: `${criteria.code}-S${nextNum}`,
        name: "",
        description: "",
        weight: 0,
        type: "BENEFIT",
        isNew: true,
        markedForDeletion: false,
      },
    ]);
  };

  const handleRemoveSub = (index: number) => {
    if (activeSubs.length === 1) return; // Min 1 sub-kriteria
    setSubs((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        // Kalau isNew, hapus langsung dari state
        // Kalau existing, mark for deletion (akan dihapus saat submit)
        if (s.isNew) return { ...s, markedForDeletion: true };
        return { ...s, markedForDeletion: true };
      }),
    );
  };

  const handleUndoRemove = (index: number) => {
    setSubs((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, markedForDeletion: false } : s,
      ),
    );
  };

  const handleSubmit = () => {
    setError(null);

    if (!subWeightValid) {
      setError(
        `Total bobot sub-kriteria harus 100% (saat ini ${(subTotalWeight * 100).toFixed(2)}%)`,
      );
      toast.error("Validasi gagal");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("weight", String(weight));
    formData.set("isActive", String(isActive));
    formData.set("subCriteriaData", JSON.stringify(subs));

    startTransition(async () => {
      const result = await updateCriteriaAction(criteria.id, formData);

      if (result.success) {
        toast.success("Kriteria berhasil diperbarui");
        router.push("/admin/kriteria");
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menyimpan");
        toast.error(result.error ?? "Gagal menyimpan");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/kriteria">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Kriteria</h1>
          <p className="text-muted-foreground mt-1">
            <Badge variant="outline" className="font-mono mr-2">
              {criteria.code}
            </Badge>
            Perubahan akan mempengaruhi perhitungan ranking di periode
            berikutnya
          </p>
        </div>
      </div>

      {/* Lock warning */}
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

      {/* Finalized warning */}
      {!isLocked && hasFinalizedPeriods && (
        <div className="rounded-md border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-amber-900">
              <p className="font-medium">
                Perhatian: Ada Periode yang Sudah Disahkan
              </p>
              <p className="mt-1">
                Perubahan bobot tidak akan mempengaruhi hasil ranking yang sudah
                disahkan. Sistem menyimpan snapshot perhitungan di tabel{" "}
                <code className="text-xs bg-amber-100 px-1 rounded">
                  ranking_results
                </code>
                , sehingga data historis tetap akurat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      {!isLocked && (
        <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-blue-900">
              <p className="font-medium">Aturan:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Total bobot sub-kriteria harus 100%</li>
                <li>Total bobot semua kriteria aktif harus 100%</li>
                <li>Minimal 1 sub-kriteria per kriteria</li>
                <li>
                  Sub-kriteria yang sudah dipakai di penilaian tidak dapat
                  dihapus
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form Kriteria Induk */}
        <Card>
          <CardHeader>
            <CardTitle>Kriteria Induk</CardTitle>
            <CardDescription>
              Informasi utama kriteria {criteria.code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input value={criteria.code} disabled className="font-mono" />
              <p className="text-xs text-muted-foreground">
                Kode kriteria tidak dapat diubah
              </p>
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
                  Hanya kriteria aktif yang dipakai dalam perhitungan ranking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Sub-Kriteria */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sub-Kriteria ({activeSubs.length})</CardTitle>
                <CardDescription>Total bobot harus tepat 100%</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  subWeightValid
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {subWeightValid ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {(subTotalWeight * 100).toFixed(2)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subs.map((sub, index) => {
                if (sub.markedForDeletion) {
                  return (
                    <div
                      key={sub.id}
                      className="p-4 border-2 border-dashed border-destructive/50 rounded-md bg-destructive/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <Badge
                            variant="outline"
                            className="font-mono line-through"
                          >
                            {sub.code}
                          </Badge>
                          <span className="text-sm text-muted-foreground line-through">
                            {sub.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoRemove(index)}
                          disabled={isPending || isLocked}
                        >
                          Batalkan Hapus
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={sub.id}
                    className={`space-y-3 p-4 border rounded-md ${
                      sub.isNew
                        ? "bg-green-50/50 border-green-200"
                        : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {sub.isNew ? (
                          <Input
                            value={sub.code}
                            onChange={(e) =>
                              handleSubChange(
                                index,
                                "code",
                                e.target.value.toUpperCase(),
                              )
                            }
                            disabled={isPending || isLocked}
                            className="font-mono text-sm w-32"
                            placeholder={`${criteria.code}-S?`}
                          />
                        ) : (
                          <Badge variant="outline" className="font-mono">
                            {sub.code}
                          </Badge>
                        )}
                        {sub.isNew && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Baru
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            sub.type === "BENEFIT"
                              ? "bg-green-50 text-green-700 border-green-200 text-xs"
                              : "bg-orange-50 text-orange-700 border-orange-200 text-xs"
                          }
                        >
                          {sub.type === "BENEFIT" ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {sub.type}
                        </Badge>
                        {activeSubs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSub(index)}
                            disabled={isPending || isLocked}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Nama</Label>
                      <Input
                        value={sub.name}
                        onChange={(e) =>
                          handleSubChange(index, "name", e.target.value)
                        }
                        disabled={isPending || isLocked}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Deskripsi</Label>
                      <Textarea
                        value={sub.description}
                        onChange={(e) =>
                          handleSubChange(index, "description", e.target.value)
                        }
                        disabled={isPending || isLocked}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Bobot</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            max="1"
                            value={sub.weight}
                            onChange={(e) =>
                              handleSubChange(index, "weight", e.target.value)
                            }
                            disabled={
                              isPending || isLocked || activeSubs.length === 1
                            }
                            required
                            className="font-mono"
                          />
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {(sub.weight * 100).toFixed(2)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipe</Label>
                        <Select
                          value={sub.type}
                          onValueChange={(value) =>
                            handleSubChange(index, "type", value)
                          }
                          disabled={isPending || isLocked}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BENEFIT">BENEFIT</SelectItem>
                            <SelectItem value="COST">COST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddSub}
                disabled={isPending || isLocked}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Sub-Kriteria
              </Button>
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
          disabled={isPending || !subWeightValid || isLocked}
          className="bg-bps-primary hover:bg-bps-primary/90"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
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
