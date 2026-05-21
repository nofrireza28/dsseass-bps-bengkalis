"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction } from "./action";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);

      if (result.success) {
        toast.success("Login berhasil", {
          description: "Mengarahkan ke dashboard...",
        });
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result.error ?? "Login gagal");
        toast.error("Login gagal", {
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-bold text-bps-primary">Selamat Datang</h2>
        <p className="text-sm text-muted-foreground">
          Masukkan kredensial Anda untuk mengakses sistem
        </p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nama@bps-bengkalis.go.id"
            required
            disabled={isPending}
            autoComplete="email"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={isPending}
            autoComplete="current-password"
            className="h-11"
          />
        </div>

        {error && (
          <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-bps-primary hover:bg-bps-primary/90 text-white font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Masuk
            </>
          )}
        </Button>
      </form>

      {/* Footer info */}
      <div className="pt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Lupa password? Hubungi administrator sistem
        </p>
      </div>
    </div>
  );
}
