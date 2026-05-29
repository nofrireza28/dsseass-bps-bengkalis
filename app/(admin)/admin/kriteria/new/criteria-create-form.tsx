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

import { createCriteriaAction } from "../action";

const FLOAT_TOLERANCE = 0.0001;

interface CriteriaCreateFormProps {
  suggestedCode: string;
  isLocked: boolean;
  lockReason: string | null;
}

interface SubCriteriaDraft {
  tempId: string;
  code: string;
  name: string;
  description: string;
  weight: number;
  type: "BENEFIT" | "COST";
}

export function CriteriaCreateForm({
  suggestedCode,
  isLocked,
  lockReason,
}: CriteriaCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // State kriteria induk
  const [code, setCode] = useState(suggestedCode);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState(0);
  const [isActive, setIsActive] = useState(false); // Default false agar tidak kena validasi total

  // State sub-kriteria (default 1)
  const [subs, setSubs] = useState<SubCriteriaDraft[]>(() => [
    {
      tempId: `temp-${Date.now()}`,
      code: `${suggestedCode}-S1`,
      name: "",
      description: "",
      weight: 1,
      type: "BENEFIT",
    },
  ]);

  // Live validation
  const subTotalWeight = useMemo(
    () => subs.reduce((sum, s) => sum + (Number(s.weight) || 0), 0),
    [subs],
  );
  const subWeightValid = Math.abs(subTotalWeight - 1.0) < FLOAT_TOLERANCE;

  // Saat code kriteria berubah, update prefix sub-kriteria yang belum di-rename manual
  const handleCodeChange = (newCode: string) => {
    const upperCode = newCode.toUpperCase();
    setCode(upperCode);
    // Auto-update sub codes yang masih default
    setSubs((prev) =>
      prev.map((s, idx) => {
        const expectedDefault = `${code}-S${idx + 1}`;
        // Hanya ganti kalau masih default (belum di-rename user)
        if (s.code === expectedDefault) {
          return { ...s, code: `${upperCode}-S${idx + 1}` };
        }
        return s;
      }),
    );
  };

  const handleSubChange = (
    index: number,
    field: keyof SubCriteriaDraft,
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
    const nextNum = subs.length + 1;
    setSubs((prev) => [
      ...prev,
      {
        tempId: `temp-${Date.now()}-${nextNum}`,
        code: `${code}-S${nextNum}`,
        name: "",
        description: "",
        weight: 0,
        type: "BENEFIT",
      },
    ]);
  };

  const handleRemoveSub = (index: number) => {
    if (subs.length === 1) return; // Tidak boleh hapus terakhir
    setSubs((prev) => prev.filter((_, i) => i !== index));
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
    formData.set("code", code);
    formData.set("name", name);
    formData.set("description", description);
    formData.set("weight", String(weight));
    formData.set("isActive", String(isActive));
    formData.set(
      "subCriteriaData",
      JSON.stringify(
        subs.map((s) => ({
          code: s.code,
          name: s.name,
          description: s.description,
          weight: s.weight,
          type: s.type,
        })),
      ),
    );

    startTransition(async () => {
      const result = await createCriteriaAction(formData);

      if (result.success) {
        toast.success("Kriteria berhasil ditambahkan");
        router.push("/admin/kriteria");
        router.refresh();
      } else {
        setError(result.error ?? "Gagal menambahkan kriteria");
        toast.error(result.error ?? "Gagal menambahkan kriteria");
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
          <h1 className="text-3xl font-bold tracking-tight">Tambah Kriteria</h1>
          <p className="text-muted-foreground mt-1">
            Buat kriteria baru beserta sub-kriterianya
          </p>
        </div>
      </div>

      {/* Lock warning */}
      {isLocked && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-destructive">
              <p className="font-medium">Tidak Dapat Menambah Kriteria</p>
              <p className="mt-1">{lockReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info default isActive false */}
      {!isLocked && (
        <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-blue-900">
              <p className="font-medium">Tips:</p>
              <p className="mt-1">
                Buat kriteria sebagai <strong>tidak aktif</strong> dulu. Setelah
                kamu sesuaikan bobot kriteria lain agar total tetap 100%, baru
                aktifkan kriteria ini melalui menu Edit.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form Kriteria Induk */}
        <Card>
          <CardHeader>
            <CardTitle>Kriteria Induk</CardTitle>
            <CardDescription>Informasi utama kriteria baru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code">
                Kode <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={isPending || isLocked}
                required
                className="font-mono uppercase"
                placeholder="K06"
              />
              <p className="text-xs text-muted-foreground">
                Format saran: K06, K07, dst (tidak boleh duplikat)
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
                placeholder="Nama kriteria..."
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
                placeholder="Penjelasan tentang kriteria ini..."
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
                  min="0"
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
                Nilai 0–1 (contoh: 0.15 untuk 15%)
              </p>
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
                  Aktifkan langsung
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hati-hati: total bobot semua kriteria aktif harus tetap 100%
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
                <CardTitle>Sub-Kriteria ({subs.length})</CardTitle>
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
              {subs.map((sub, index) => (
                <div
                  key={sub.tempId}
                  className="space-y-3 p-4 border rounded-md bg-muted/20 relative"
                >
                  <div className="flex items-center justify-between gap-2">
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
                      placeholder="K06-S1"
                    />
                    {subs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSub(index)}
                        disabled={isPending || isLocked}
                        className="text-destructive hover:text-destructive"
                        title="Hapus sub-kriteria"
                      >
                        <Trash2 className="h-4 w-4" />
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
                      placeholder="Nama sub-kriteria..."
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
                          disabled={isPending || isLocked || subs.length === 1}
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
              ))}

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
            "Simpan Kriteria"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/kriteria">Batal</Link>
        </Button>
      </div>
    </div>
  );
}
