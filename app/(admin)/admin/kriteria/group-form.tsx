"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
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

import { createCriteriaAction, updateCriteriaAction } from "./action";

const FLOAT_TOLERANCE = 0.0001;

interface SubCriteriaState {
  id: string; // existing UUID atau temp-* untuk yang baru
  code: string;
  name: string;
  description: string;
  weight: number;
  type: "BENEFIT" | "COST";
  isNew: boolean;
  markedForDeletion: boolean;
}

interface GroupFormProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    code: string;
    name: string;
    description: string;
    isActive: boolean;
    subs: Omit<SubCriteriaState, "isNew" | "markedForDeletion">[];
  };
  otherLeafWeight: number;
  isLocked: boolean;
  lockReason: string | null;
  hasFinalizedPeriods: boolean;
}

export function GroupForm({
  mode,
  initial,
  otherLeafWeight,
  isLocked,
  lockReason,
  hasFinalizedPeriods,
}: GroupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);

  const [subs, setSubs] = useState<SubCriteriaState[]>(() => {
    if (initial?.subs && initial.subs.length > 0) {
      return initial.subs.map((s) => ({
        ...s,
        isNew: false,
        markedForDeletion: false,
      }));
    }
    // Default 1 sub kosong untuk create mode
    return [
      {
        id: `temp-${Date.now()}`,
        code: "",
        name: "",
        description: "",
        weight: 0,
        type: "BENEFIT",
        isNew: true,
        markedForDeletion: false,
      },
    ];
  });

  const activeSubs = useMemo(
    () => subs.filter((s) => !s.markedForDeletion),
    [subs],
  );

  const groupWeight = useMemo(
    () => activeSubs.reduce((s, sc) => s + (Number(sc.weight) || 0), 0),
    [activeSubs],
  );

  const totalLeafWeight = groupWeight + otherLeafWeight;
  const totalValid =
    !isActive || Math.abs(totalLeafWeight - 1.0) < FLOAT_TOLERANCE;

  const handleSubChange = (
    index: number,
    field: keyof SubCriteriaState,
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
    const nextNum = activeSubs.length + 1;
    setSubs((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${nextNum}`,
        code: code ? `${code}-${nextNum}` : "",
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
    if (activeSubs.length === 1) return;
    setSubs((prev) =>
      prev.map((s, i) => (i !== index ? s : { ...s, markedForDeletion: true })),
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

    if (isActive && !totalValid) {
      setError(
        `Total bobot leaf harus 100% (saat ini ${(totalLeafWeight * 100).toFixed(2)}%)`,
      );
      toast.error("Validasi gagal");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("isActive", String(isActive));
    formData.set("subCriteriaData", JSON.stringify(subs));

    if (mode === "create") {
      formData.set("code", code);
      formData.set("isGroup", "true");
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCriteriaAction(formData)
          : await updateCriteriaAction(initial!.id, formData);

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Kriteria grup berhasil dibuat"
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
      ? "Tambah Kriteria GRUP"
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
            Kriteria grup dengan sub-kriteria yang dinilai multi-rater
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

      {!isLocked && (
        <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-blue-900">
              <p className="font-medium">Model Leaf-Based:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Bobot induk grup = jumlah bobot sub-kriteria (otomatis)</li>
                <li>
                  Total bobot leaf (semua sub + leaf criteria lain) harus 100%
                </li>
                <li>Minimal 1 sub-kriteria per grup</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Info Kriteria */}
        <Card>
          <CardHeader>
            <CardTitle>Info Kriteria Grup</CardTitle>
            <CardDescription>
              Bobot induk dihitung otomatis dari jumlah sub-kriteria
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
                placeholder="PRO, INT, dst"
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
              <Label>Bobot Grup (otomatis)</Label>
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                <span className="text-2xl font-bold font-mono">
                  {(groupWeight * 100).toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  = jumlah {activeSubs.length} sub-kriteria
                </span>
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
                  Hanya kriteria aktif yang dipakai dalam perhitungan
                </p>
              </div>
            </div>

            {/* Live total leaf summary */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                Ringkasan Bobot Leaf:
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Bobot grup ini:</span>
                  <span className="font-mono">
                    {(groupWeight * 100).toFixed(2)}%
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

        {/* Sub-Kriteria */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sub-Kriteria ({activeSubs.length})</CardTitle>
                <CardDescription>Yang dinilai multi-rater</CardDescription>
              </div>
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
                            {sub.code || "(tanpa kode)"}
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
                      <div className="flex items-center gap-2 flex-1">
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
                          placeholder={`${code || "XXX"}-1`}
                        />
                        {sub.isNew && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Baru
                          </Badge>
                        )}
                      </div>
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
                            disabled={isPending || isLocked}
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
                            <SelectItem value="BENEFIT">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                BENEFIT
                              </div>
                            </SelectItem>
                            <SelectItem value="COST">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-3 w-3 text-orange-600" />
                                COST
                              </div>
                            </SelectItem>
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
