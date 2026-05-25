"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil, PowerOff, Power, Search, Loader2 } from "lucide-react";

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

import { deactivateEmployeeAction, reactivateEmployeeAction } from "./action";

interface Employee {
  id: string;
  nip: string;
  fullName: string;
  position: string | null;
  status: string;
  joinedAt: string | null;
  exitedAt: string | null;
}

interface EmployeesTableProps {
  employees: Employee[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Aktif",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  INACTIVE: {
    label: "Nonaktif",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  ON_LEAVE: {
    label: "Cuti",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
};

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const query = search.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(query) ||
        emp.nip.includes(query) ||
        emp.position?.toLowerCase().includes(query),
    );
  }, [employees, search]);

  const handleDeactivate = (employeeId: string, name: string) => {
    startTransition(async () => {
      const result = await deactivateEmployeeAction(employeeId);
      if (result.success) {
        toast.success(`${name} berhasil dinonaktifkan`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menonaktifkan pegawai");
      }
    });
  };

  const handleReactivate = (employeeId: string, name: string) => {
    startTransition(async () => {
      const result = await reactivateEmployeeAction(employeeId);
      if (result.success) {
        toast.success(`${name} berhasil diaktifkan kembali`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal mengaktifkan pegawai");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, NIP, atau jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredEmployees.length} dari {employees.length} pegawai
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NIP</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal Masuk</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  {search
                    ? "Tidak ada pegawai yang sesuai pencarian"
                    : "Belum ada data pegawai. Klik tombol 'Tambah Pegawai' untuk memulai."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                const statusConfig = STATUS_CONFIG[emp.status] ?? {
                  label: emp.status,
                  className: "",
                };
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">
                      {emp.nip}
                    </TableCell>
                    <TableCell className="font-medium">
                      {emp.fullName}
                    </TableCell>
                    <TableCell>
                      {emp.position || (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusConfig.className}
                        variant="outline"
                      >
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.joinedAt
                        ? new Date(emp.joinedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/pegawai/${emp.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/pegawai/${emp.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>

                        {emp.status === "ACTIVE" ||
                        emp.status === "ON_LEAVE" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isPending}
                                className="text-destructive hover:text-destructive"
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Nonaktifkan {emp.fullName}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Pegawai akan ditandai sebagai INACTIVE dan
                                  tidak akan ikut dalam periode penilaian
                                  berikutnya. Data history tetap tersimpan dan
                                  tidak terhapus.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeactivate(emp.id, emp.fullName)
                                  }
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Ya, Nonaktifkan"
                                  )}
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
                              handleReactivate(emp.id, emp.fullName)
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
