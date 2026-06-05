"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Unlock,
  Loader2,
  CheckCircle2,
  Circle,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { unsubmitEvaluationAction } from "../../action";
import type { AdminEvaluationItem } from "@/lib/evaluation-helpers";

type StatusFilter = "ALL" | "SUBMITTED" | "DRAFT";

interface Props {
  evaluations: AdminEvaluationItem[];
  periodStatus: string;
}

export function EvaluationsAuditTable({ evaluations, periodStatus }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<AdminEvaluationItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPeriodOpen = periodStatus === "OPEN";

  // Stats
  const stats = useMemo(() => {
    const submitted = evaluations.filter(
      (e) => e.status === "SUBMITTED",
    ).length;
    return {
      total: evaluations.length,
      submitted,
      draft: evaluations.length - submitted,
    };
  }, [evaluations]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evaluations.filter((e) => {
      const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
      const matchSearch =
        q === "" ||
        e.evaluatorName.toLowerCase().includes(q) ||
        e.evaluateeName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [evaluations, search, statusFilter]);

  function handleUnsubmit() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await unsubmitEvaluationAction(selected.id);
      if (result.success) {
        setSelected(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Penilaian</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Sudah Submit</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.submitted}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Masih Draft</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {stats.draft}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notice kalau periode bukan OPEN */}
      {!isPeriodOpen && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Periode berstatus{" "}
            <span className="font-medium">{periodStatus}</span>. Fitur buka
            kunci hanya tersedia saat periode OPEN. Halaman ini kini bersifat
            baca-saja untuk keperluan audit.
          </p>
        </div>
      )}

      {/* Controls + Table */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama evaluator atau evaluatee..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Filter */}
            <div className="flex gap-1">
              {(["ALL", "SUBMITTED", "DRAFT"] as StatusFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={statusFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(f)}
                >
                  {f === "ALL"
                    ? "Semua"
                    : f === "SUBMITTED"
                      ? "Selesai"
                      : "Draft"}
                </Button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evaluator (Penilai)</TableHead>
                <TableHead>Evaluatee (Dinilai)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waktu Submit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.evaluatorName}
                    </TableCell>
                    <TableCell>{e.evaluateeName}</TableCell>
                    <TableCell>
                      {e.status === "SUBMITTED" ? (
                        <Badge
                          variant="outline"
                          className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Selesai
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          <Circle className="mr-1 h-3 w-3" />
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.submittedAt
                        ? new Date(e.submittedAt).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {e.status === "SUBMITTED" && isPeriodOpen ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected(e);
                            setError(null);
                          }}
                        >
                          <Unlock className="mr-1 h-3 w-3" />
                          Buka Kunci
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {stats.total} penilaian.
          </p>
        </CardContent>
      </Card>

      {/* Dialog konfirmasi unsubmit */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Kunci Penilaian?</DialogTitle>
            <DialogDescription>
              Penilaian dari{" "}
              <span className="font-medium text-foreground">
                {selected?.evaluatorName}
              </span>{" "}
              untuk{" "}
              <span className="font-medium text-foreground">
                {selected?.evaluateeName}
              </span>{" "}
              akan dikembalikan ke status DRAFT. Evaluator dapat mengedit ulang
              dan wajib submit kembali sebelum periode ditutup.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button onClick={handleUnsubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Buka Kunci
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
