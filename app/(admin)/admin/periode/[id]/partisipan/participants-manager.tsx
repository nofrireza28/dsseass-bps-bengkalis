"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  Loader2,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  STATUS_LABELS,
  STATUS_COLORS,
  type PeriodStatus,
} from "@/lib/period-constants";

import {
  addParticipantAction,
  addAllActiveEmployeesAction,
  removeParticipantAction,
  updateParticipantRoleAction,
  clearAllParticipantsAction,
} from "../../participant-action";

interface Participant {
  periodId: string;
  employeeId: string;
  isEvaluator: boolean;
  isEvaluatee: boolean;
  notes: string | null;
  employee: {
    id: string;
    fullName: string;
    nip: string;
    position: string | null;
    status: string;
  };
}

interface AvailableEmployee {
  id: string;
  fullName: string;
  nip: string;
  position: string | null;
}

interface Props {
  periodId: string;
  periodName: string;
  periodStatus: string;
  participants: Participant[];
  availableEmployees: AvailableEmployee[];
}

export function ParticipantsManager({
  periodId,
  periodName,
  periodStatus,
  participants,
  availableEmployees,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Participant | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [addAllOpen, setAddAllOpen] = useState(false);

  const isDraft = periodStatus === "DRAFT";
  const status = periodStatus as PeriodStatus;

  const evaluatorCount = participants.filter((p) => p.isEvaluator).length;
  const evaluateeCount = participants.filter((p) => p.isEvaluatee).length;

  const handleAddSingle = () => {
    if (!selectedEmployeeId) return;
    startTransition(async () => {
      const result = await addParticipantAction(periodId, selectedEmployeeId);
      if (result.success) {
        toast.success("Partisipan berhasil ditambahkan");
        setAddDialogOpen(false);
        setSelectedEmployeeId("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menambah partisipan");
      }
    });
  };

  const handleAddAll = () => {
    startTransition(async () => {
      const result = await addAllActiveEmployeesAction(periodId);
      if (result.success) {
        toast.success(`${result.count} pegawai aktif berhasil ditambahkan`);
        setAddAllOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menambahkan");
      }
    });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    const target = removeTarget;
    startTransition(async () => {
      const result = await removeParticipantAction(periodId, target.employeeId);
      if (result.success) {
        toast.success(`${target.employee.fullName} dihapus dari partisipan`);
        setRemoveTarget(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus");
      }
    });
  };

  const handleClearAll = () => {
    startTransition(async () => {
      const result = await clearAllParticipantsAction(periodId);
      if (result.success) {
        toast.success(`${result.count} partisipan dihapus`);
        setClearAllOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus");
      }
    });
  };

  const handleToggleRole = (
    participant: Participant,
    field: "isEvaluator" | "isEvaluatee",
    value: boolean,
  ) => {
    const newEvaluator =
      field === "isEvaluator" ? value : participant.isEvaluator;
    const newEvaluatee =
      field === "isEvaluatee" ? value : participant.isEvaluatee;

    startTransition(async () => {
      const result = await updateParticipantRoleAction(
        periodId,
        participant.employeeId,
        newEvaluator,
        newEvaluatee,
      );
      if (result.success) {
        toast.success("Peran partisipan diperbarui");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/periode/${periodId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Partisipan
          </h1>
          <p className="text-muted-foreground mt-1">
            Periode: <strong>{periodName}</strong>
          </p>
          <div className="mt-2">
            <Badge variant="outline" className={STATUS_COLORS[status]}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Lock notice */}
      {!isDraft && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-destructive">
              <p className="font-medium">Daftar Partisipan Terkunci</p>
              <p className="mt-1">
                Periode berstatus <strong>{STATUS_LABELS[status]}</strong>.
                Daftar partisipan tidak dapat diubah selain pada status DRAFT.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{participants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Partisipan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{evaluatorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sebagai Evaluator
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{evaluateeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sebagai Evaluatee
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      {isDraft && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setAddDialogOpen(true)}
            disabled={isPending || availableEmployees.length === 0}
            className="bg-bps-primary hover:bg-bps-primary/90"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah Pegawai
            {availableEmployees.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {availableEmployees.length} tersedia
              </Badge>
            )}
          </Button>

          {availableEmployees.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setAddAllOpen(true)}
              disabled={isPending}
            >
              <Users className="mr-2 h-4 w-4" />
              Tambah Semua ({availableEmployees.length})
            </Button>
          )}

          {participants.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setClearAllOpen(true)}
              disabled={isPending}
              className="text-destructive hover:text-destructive border-destructive/30"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus Semua
            </Button>
          )}
        </div>
      )}

      {/* Participants table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Partisipan ({participants.length})</CardTitle>
          <CardDescription>
            {isDraft
              ? "Centang/uncheck untuk mengubah peran. Minimal salah satu peran harus tercentang."
              : "Daftar partisipan dalam mode baca-only"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Belum Ada Partisipan</h3>
              <p className="text-muted-foreground">
                {isDraft
                  ? "Tambahkan partisipan menggunakan tombol di atas."
                  : "Periode ini tidak memiliki partisipan."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Pegawai</TableHead>
                    <TableHead className="text-center w-32">
                      Evaluator
                    </TableHead>
                    <TableHead className="text-center w-32">
                      Evaluatee
                    </TableHead>
                    {isDraft && (
                      <TableHead className="w-16 text-right">Aksi</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p, i) => (
                    <TableRow key={p.employeeId}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {p.employee.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            NIP: {p.employee.nip}
                            {p.employee.position && ` · ${p.employee.position}`}
                          </div>
                          {p.employee.status !== "ACTIVE" && (
                            <Badge
                              variant="outline"
                              className="text-xs mt-1 bg-amber-50 text-amber-700 border-amber-200"
                            >
                              {p.employee.status === "ON_LEAVE"
                                ? "Sedang Cuti"
                                : "Nonaktif"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={p.isEvaluator}
                          disabled={!isDraft || isPending}
                          onCheckedChange={(v) =>
                            handleToggleRole(p, "isEvaluator", v === true)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={p.isEvaluatee}
                          disabled={!isDraft || isPending}
                          onCheckedChange={(v) =>
                            handleToggleRole(p, "isEvaluatee", v === true)
                          }
                        />
                      </TableCell>
                      {isDraft && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemoveTarget(p)}
                            disabled={isPending}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Add Single */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Partisipan</DialogTitle>
            <DialogDescription>
              Pilih pegawai aktif yang akan ditambahkan sebagai partisipan
              periode. Peran default: evaluator dan evaluatee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih pegawai..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.nip})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {availableEmployees.length} pegawai aktif tersedia untuk
              ditambahkan
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedEmployeeId("");
              }}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleAddSingle}
              disabled={isPending || !selectedEmployeeId}
              className="bg-bps-primary hover:bg-bps-primary/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Add All */}
      <AlertDialog open={addAllOpen} onOpenChange={setAddAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tambah Semua Pegawai Aktif?</AlertDialogTitle>
            <AlertDialogDescription>
              {availableEmployees.length} pegawai aktif yang belum jadi
              partisipan akan ditambahkan dengan peran evaluator dan evaluatee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddAll} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Tambahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Remove */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus partisipan?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.employee.fullName}</strong> akan dihapus
              dari daftar partisipan periode ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Clear All */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Semua Partisipan?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua {participants.length} partisipan akan dihapus dari periode
              ini. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
