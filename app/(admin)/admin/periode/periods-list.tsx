"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2, Calendar, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { deletePeriodAction } from "./action";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PERIOD_TYPE_LABELS,
  formatPeriodDateRange,
  type PeriodStatus,
  type PeriodType,
} from "@/lib/period-constants";

interface PeriodDisplay {
  id: string;
  name: string;
  periodType: string;
  year: number;
  periodIndex: number | null;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: Date;
}

interface PeriodsListProps {
  periods: PeriodDisplay[];
}

export function PeriodsList({ periods }: PeriodsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PeriodDisplay | null>(null);

  const handleDelete = (target: PeriodDisplay) => {
    startTransition(async () => {
      const result = await deletePeriodAction(target.id);
      if (result.success) {
        toast.success(`Periode ${target.name} berhasil dihapus`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus periode");
      }
      setDeleteTarget(null);
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {periods.map((period) => {
          const isDraft = period.status === "DRAFT";
          const status = period.status as PeriodStatus;
          const periodType = period.periodType as PeriodType;

          return (
            <Card key={period.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[status] ?? ""}
                  >
                    {STATUS_LABELS[status] ?? period.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {PERIOD_TYPE_LABELS[periodType] ?? period.periodType}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{period.name}</CardTitle>
                {period.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {period.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatPeriodDateRange(period.startDate, period.endDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-4 pt-3 border-t">
                  <Button asChild variant="ghost" size="sm" className="flex-1">
                    <Link href={`/admin/periode/${period.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      Detail
                    </Link>
                  </Button>

                  {isDraft && (
                    <>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/periode/${period.id}/edit`}>
                          <Pencil className="h-3 w-3" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setDeleteTarget(period)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus periode {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Periode ini masih dalam status DRAFT dan dapat dihapus secara
              permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
