"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createUserAction } from "../action";

interface EmployeeOption {
  id: string;
  nip: string;
  fullName: string;
  position: string | null;
}

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

interface CreateUserFormProps {
  employees: EmployeeOption[];
  roles: RoleOption[];
}

export function CreateUserForm({ employees, roles }: CreateUserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    // Inject employeeId dan roleIds
    formData.set("employeeId", employeeId);

    // Clear existing roleIds, set fresh
    formData.delete("roleIds");
    selectedRoleIds.forEach((id) => formData.append("roleIds", id));

    startTransition(async () => {
      const result = await createUserAction(formData);

      if (result.success) {
        toast.success("Akun berhasil dibuat", {
          description:
            "User dapat segera login dengan kredensial yang diberikan",
        });
        router.push("/admin/akun");
        router.refresh();
      } else {
        setError(result.error ?? "Gagal membuat akun");
        toast.error(result.error ?? "Gagal membuat akun");
      }
    });
  };

  // Pre-fill email berdasarkan NIP pegawai yang dipilih
  const selectedEmployee = employees.find((emp) => emp.id === employeeId);
  const suggestedEmail = selectedEmployee
    ? `${selectedEmployee.nip}@bps.go.id`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/akun">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buat Akun Baru</h1>
          <p className="text-muted-foreground mt-1">
            Buat akun login untuk pegawai yang sudah terdaftar
          </p>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card className="max-w-3xl">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              Semua pegawai sudah punya akun. Tambahkan pegawai baru dulu
              sebelum bisa membuat akun.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/admin/pegawai/new">Tambah Pegawai</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>
              Pilih pegawai yang akan dibuatkan akun, tentukan email login,
              password awal dan role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-5">
              {/* Pilih Pegawai */}
              <div className="space-y-2">
                <Label htmlFor="employeeId">
                  Pegawai<span className="text-destructive">*</span>
                </Label>
                <Select
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Pegawai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div>
                          <div>{emp.fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            NIP: {emp.nip}
                            {emp.position && ` . ${emp.position}`}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Hanya pegawai yang belum punya akun yang muncul di daftar
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={suggestedEmail}
                  key={suggestedEmail} // re-render input saat employee berubah
                  disabled={isPending}
                  placeholder="email@bps.go.id"
                />
                <p className="text-xs text-muted-foreground">
                  Email akan dipakai untuk login. Dapat diubah jika perlu.
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password Awal<span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    disabled={isPending}
                    className="pr-10"
                    placeholder="Minimal 8 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  User dapat mengubah password setelah login pertama
                </p>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <Label>
                  Role <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2 border rounded-md p-4">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                        disabled={isPending}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {role.name}
                        </label>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  User dapat memiliki lebih dari satu role
                </p>
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
                      Membuat akun...
                    </>
                  ) : (
                    "Buat Akun"
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/akun">Batal</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
