"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Pencil,
  KeyRound,
  Power,
  PowerOff,
  Search,
  Loader2,
  Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toggleUserStatusAction, resetPasswordAction } from "./action";

interface UserWithRoles {
  id: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  employeeId: string | null;
  employeeName: string | null;
  employeeNip: string | null;
  roles: string[];
}

interface UserTableProps {
  users: UserWithRoles[];
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  PIMPINAN: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  PEGAWAI: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export function UsersTable({ users }: UserTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );
  const [passwordDialogUser, setPasswordDialogUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const query = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        u.employeeName?.toLowerCase().includes(query) ||
        u.employeeNip?.includes(query) ||
        u.roles.some((r) => r.toLowerCase().includes(query)),
    );
  }, [users, search]);
  const handleToggleStatus = (
    userId: string,
    newStatus: boolean,
    email: string,
  ) => {
    startTransition(async () => {
      const result = await toggleUserStatusAction(userId, newStatus);
      if (result.success) {
        toast.success(
          newStatus
            ? `Akun ${email} diaktifkan`
            : `Akun ${email} dinonaktifkan`,
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal mengubah status");
      }
    });
  };

  const handleResetPassword = (userId: string, name: string) => {
    setPasswordDialogUser({ id: userId, name });
    const formData = new FormData();
    formData.set("useGenerated", "true");

    startTransition(async () => {
      const result = await resetPasswordAction(userId, formData);
      if (result.success && result.generatedPassword) {
        setGeneratedPassword(result.generatedPassword);
      } else {
        toast.error(result.error ?? "Gagal reset password");
        setPasswordDialogUser(null);
      }
    });
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast.success("Password ter-copy ke clipboard");
    }
  };

  const handleClosePasswordDialog = () => {
    setGeneratedPassword(null);
    setPasswordDialogUser(null);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari email, nama, nip, atau role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} dari {users.length} akun
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Pegawai</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login Terakhir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  {search
                    ? "Tidak ada akun yang sesuai pencarian"
                    : "Belum ada akun pengguna."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.employeeName ? (
                      <div>
                        <div className="text-sm">{user.employeeName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.employeeNip}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Tidak terkait
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground italic text-xs">
                          Tidak ada role
                        </span>
                      ) : (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={ROLE_BADGE_COLORS[role] ?? ""}
                          >
                            {role}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                      }
                    >
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Belum pernah"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Edit Role"
                      >
                        <Link href={`/admin/akun/${user.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset Password</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sistem akan men-generate password baru untuk akun{" "}
                              <strong>{user.email}</strong>. Pastikan menyalin
                              password yang muncul dan menyampaikannya ke user
                              secara aman.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleResetPassword(
                                  user.id,
                                  user.employeeName ?? user.email,
                                )
                              }
                              className="bg-bps-primary hover:bg-bps-primary/90"
                            >
                              Generate Password Baru
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {user.isActive ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isPending}
                              className="text-destructive hover:text-destructive"
                              title="Nonaktifkan"
                            >
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Nonaktifkan akun {user.email}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                User tidak akan bisa login lagi sampai akun
                                diaktifkan kembali.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleToggleStatus(user.id, false, user.email)
                                }
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Ya, Nonaktifkan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() =>
                            handleToggleStatus(user.id, true, user.email)
                          }
                          className="text-green-600 hover:text-green-700"
                          title="Aktifkan kembali"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog tampilkan password yang di generate */}
      <AlertDialog
        open={!!generatedPassword}
        onOpenChange={(open) => !open && handleClosePasswordDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Password Baru berhasil dibuat</AlertDialogTitle>
            <AlertDialogDescription>
              Password baru untuk akun{" "}
              <strong>{passwordDialogUser?.name}</strong> telah ter-generate.
              Pastikan menyalin password ini sekarang - tidak akan ditampilkan
              lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 my-4">
            <code className="flex-1 bg-muted px-4 py-3 rounded-md font-mono text-lg select-all">
              {generatedPassword}
            </code>
            <Button onClick={handleCopyPassword} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClosePasswordDialog}>
              Selesai
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isPending && !passwordDialogUser && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-md p-3 flex items-center gap-2 border">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Memproses...</span>
        </div>
      )}
    </div>
  );
}
