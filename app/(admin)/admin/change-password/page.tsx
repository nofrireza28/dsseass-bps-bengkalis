import { ChangePasswordForm } from "@/app/(auth)/change-password/change-password-form";

export default function AdminChangePasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Akun</h1>
        <p className="text-muted-foreground mt-1">
          Kelola pengaturan keamanan akun Anda
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
