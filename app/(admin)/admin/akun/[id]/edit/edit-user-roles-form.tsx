"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { updateUserRolesAction } from "../../action";

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

interface EditUserRolesFormProps {
  userId: string;
  userInfo: {
    userId: string;
    email: string;
    employeeName: string | null;
    employeeNip: string | null;
  };
  allRoles: RoleOption[];
  currentRoleIds: string[];
}

export function EditUserRolesForm({
  userId,
  userInfo,
  allRoles,
  currentRoleIds,
}: EditUserRolesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] =
    useState<string[]>(currentRoleIds);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    formData.delete("roleIds");
    selectedRoleIds.forEach((id) => formData.append("roleIds", id));

    startTransition(async () => {
      const result = await updateUserRolesAction(userId, formData);

      if (result.success) {
        toast.success("Role berhasil diperbarui");
        router.push("/admin/akun");
        router.refresh();
      } else {
        setError(result.error ?? "Gagal memperbarui role");
        toast.error(result.error ?? "Gagal memperbarui role");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/akun">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit Role Pengguna
          </h1>
          <p className="text-muted-foreground mt-1">
            Ubah role yang ditugaskan untuk akun ini
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{userInfo.email}</CardTitle>
          <CardDescription>
            {userInfo.employeeName ? (
              <>
                {userInfo.employeeName} . NIP: {userInfo.employeeNip}
              </>
            ) : (
              "Akun tidak terkait dengan pegawai"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2 border rounded-md p-4">
                {allRoles.map((role) => (
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
                Minimal 1 role harus dipilih
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
                    <Loader2 className="mr-2 h-4 w-4" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/akun">Batal</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
