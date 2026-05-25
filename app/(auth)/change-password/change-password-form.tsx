"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { changePasswordAction } from "./action";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction(formData);

      if (result.success) {
        toast.success("Password berhasil diubah", {
          description: "Gunakan password baru pada login berikutnya",
        });

        // Reset form fields
        formRef.current?.reset();

        // Reset show/hide states
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
      } else {
        setError(result.error ?? "Gagal mengubah password");
        toast.error("Gagal", { description: result.error });
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-bps-primary/10">
            <KeyRound className="h-5 w-5 text-bps-primary" />
          </div>
          <div>
            <CardTitle>Ubah Password</CardTitle>
            <CardDescription>
              Ubah password akun anda untuk meningkatkan keamanan
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password Lama</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                required
                disabled={isPending}
                autoComplete="current-password"
                className="pr-10"
                placeholder="Masukkan password lama"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={
                  showCurrent ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNew ? "text" : "password"}
                required
                disabled={isPending}
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
                placeholder="Minimal 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={
                  showNew ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimal 8 karakter. Sebaiknya gabungan huruf, angka, dan simbol
              untuk keamanan lebih.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                disabled={isPending}
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
                placeholder="Ulangi password baru"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={
                  showConfirm ? "Sembunyikan password" : "Tampilan password"
                }
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
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
                  Memproses...
                </>
              ) : (
                "Ubah Password"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
