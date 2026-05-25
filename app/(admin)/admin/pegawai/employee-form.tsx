"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import {
  createEmployeeAction,
  updateEmployeeAction,
  type EmployeeActionState,
} from "./action";

interface EmployeeFormProps {
  mode: "create" | "edit";
  employee?: {
    id: string;
    nip: string;
    fullName: string;
    position: string | null;
    status: string;
    joinedAt: string | null;
    exitedAt: string | null;
  };
}

export function EmployeeForm({ mode, employee }: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(employee?.status ?? "ACTIVE");

  const handleSubmit = (formData: FormData) => {
    setError(null);
    // Inject status karena Select tidak bisa langsung pakai name
    formData.set("status", status);

    startTransition(async () => {
      let result: EmployeeActionState;

      if (mode === "create") {
        result = await createEmployeeAction(formData);
      } else {
        if (!employee?.id) return;
        result = await updateEmployeeAction(employee.id, formData);
      }

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Pegawai berhasil ditambahkan"
            : "Data pegawai berhasil diperbarui",
        );
        router.push("/admin/pegawai");
        router.refresh();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
        toast.error(result.error ?? "Gagal menyimpan data");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/pegawai">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "create" ? "Tambah Pegawai" : "Edit Pegawai"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === "create"
              ? "Tambahkan data pegawai baru ke sistem"
              : "Perbarui informasi pegawai"}
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Informasi Pegawai</CardTitle>
          <CardDescription>
            Pastikan data yang dimasukkan akurat. NIP harus unik dan tidak boleh
            sama dengan pegawai lain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="nip">
                  NIP <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nip"
                  name="nip"
                  type="text"
                  required
                  defaultValue={employee?.nip}
                  disabled={isPending}
                  placeholder="198501012010011001"
                  pattern="\d+"
                  title="NIP hanya boleh berisi angka"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  defaultValue={employee?.fullName}
                  disabled={isPending}
                  placeholder="Nama lengkap pegawai"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Jabatan</Label>
              <Input
                id="position"
                name="position"
                type="text"
                defaultValue={employee?.position ?? ""}
                disabled={isPending}
                placeholder="Misal: Statistisi Ahli Muda"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="ON_LEAVE">Cuti</SelectItem>
                    <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinedAt">Tanggal Masuk</Label>
                <Input
                  id="joinedAt"
                  name="joinedAt"
                  type="date"
                  defaultValue={employee?.joinedAt ?? ""}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitedAt">Tanggal Keluar</Label>
                <Input
                  id="exitedAt"
                  name="exitedAt"
                  type="date"
                  defaultValue={employee?.exitedAt ?? ""}
                  disabled={isPending}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-bps-primary hover:bg-bps-primary/90"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : mode === "create" ? (
                  "Simpan Pegawai"
                ) : (
                  "Perbarui"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/pegawai">Batal</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
