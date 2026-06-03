"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Loader2,
  Users,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Calculator,
  CalendarDays,
  PenLine,
} from "lucide-react";

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

import { deleteCriteriaAction } from "./action";

interface SubCriteriaDisplay {
  id: string;
  code: string;
  name: string;
  description: string | null;
  weight: number;
  type: string;
}

interface CriteriaDisplay {
  id: string;
  code: string;
  name: string;
  description: string | null;
  weight: number;
  hasSubCriteria: boolean;
  scoringMethod: string;
  calculationType: string | null;
  type: string;
  isActive: boolean;
  subs: SubCriteriaDisplay[];
}

interface CriteriaListProps {
  criteria: CriteriaDisplay[];
  isLocked: boolean;
}

const CALC_TYPE_INFO: Record<
  string,
  { label: string; icon: typeof Calculator }
> = {
  DIRECT: { label: "Input Langsung", icon: PenLine },
  MONTHLY_AVERAGE: { label: "Rata-rata Bulanan", icon: CalendarDays },
  ABSENCE_THRESHOLD: { label: "Konversi KJK", icon: Calculator },
};

export function CriteriaList({ criteria, isLocked }: CriteriaListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<CriteriaDisplay | null>(
    null,
  );

  const handleDelete = (target: CriteriaDisplay) => {
    startTransition(async () => {
      const result = await deleteCriteriaAction(target.id);
      if (result.success) {
        toast.success(`Kriteria ${target.code} berhasil dihapus`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus kriteria");
      }
      setDeleteTarget(null);
    });
  };

  return (
    <>
      <div className="space-y-4">
        {criteria.map((crit) => {
          const isGroup = crit.hasSubCriteria;
          const CalcIcon = crit.calculationType
            ? CALC_TYPE_INFO[crit.calculationType]?.icon
            : null;

          return (
            <Card key={crit.id} className={!crit.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {crit.code}
                      </Badge>

                      {/* Badge: Grup atau Leaf */}
                      {isGroup ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          <Users className="mr-1 h-3 w-3" />
                          GRUP ({crit.subs.length} sub)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          <ClipboardList className="mr-1 h-3 w-3" />
                          LEAF
                        </Badge>
                      )}

                      {/* Badge: Type (hanya untuk leaf) */}
                      {!isGroup && (
                        <Badge
                          variant="outline"
                          className={
                            crit.type === "BENEFIT"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                          }
                        >
                          {crit.type === "BENEFIT" ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {crit.type}
                        </Badge>
                      )}

                      {!crit.isActive && (
                        <Badge variant="outline" className="bg-gray-100">
                          Nonaktif
                        </Badge>
                      )}

                      <Badge className="bg-bps-primary hover:bg-bps-primary">
                        Bobot: {(crit.weight * 100).toFixed(2)}%
                      </Badge>
                    </div>

                    <CardTitle className="text-xl">{crit.name}</CardTitle>
                    {crit.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {crit.description}
                      </p>
                    )}

                    {/* Metadata untuk leaf criteria */}
                    {!isGroup && (
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-muted-foreground">
                          Metode penilaian:
                        </span>
                        {crit.scoringMethod === "MULTI_RATER" ? (
                          <span className="inline-flex items-center gap-1 text-blue-700">
                            <Users className="h-3 w-3" />
                            Multi-Rater (penilaian rekan)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-purple-700">
                            <PenLine className="h-3 w-3" />
                            Input Panitia
                            {crit.calculationType && CalcIcon && (
                              <>
                                {" · "}
                                <CalcIcon className="h-3 w-3" />
                                {CALC_TYPE_INFO[crit.calculationType].label}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/kriteria/${crit.id}/edit`}>
                        <Pencil className="mr-2 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLocked || isPending}
                      onClick={() => setDeleteTarget(crit)}
                      className="text-destructive hover:text-destructive"
                      title={
                        isLocked
                          ? "Terkunci karena ada periode aktif"
                          : "Hapus kriteria"
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Sub-criteria list (hanya untuk grup) */}
              {isGroup && (
                <CardContent>
                  <div className="text-sm font-medium text-muted-foreground mb-3">
                    Sub-Kriteria ({crit.subs.length})
                  </div>
                  <div className="space-y-2">
                    {crit.subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-md"
                      >
                        <Badge variant="outline" className="font-mono text-xs">
                          {sub.code}
                        </Badge>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{sub.name}</div>
                          {sub.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {sub.description}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            sub.type === "BENEFIT"
                              ? "bg-green-50 text-green-700 border-green-200 text-xs"
                              : "bg-orange-50 text-orange-700 border-orange-200 text-xs"
                          }
                        >
                          {sub.type === "BENEFIT" ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {sub.type}
                        </Badge>
                        <Badge variant="outline">
                          {(sub.weight * 100).toFixed(2)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {/* Info untuk leaf criteria (tanpa sub) */}
              {!isGroup && (
                <CardContent>
                  <div className="text-sm text-muted-foreground italic">
                    Kriteria ini dinilai langsung (tanpa sub-kriteria). Bobot{" "}
                    {(crit.weight * 100).toFixed(2)}% adalah kontribusi langsung
                    ke skor akhir.
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus kriteria {deleteTarget?.code}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus kriteria{" "}
              <strong>{deleteTarget?.name}</strong>
              {deleteTarget?.hasSubCriteria &&
                ` beserta ${deleteTarget.subs.length} sub-kriteria`}
              -nya secara permanen. Tindakan ini tidak dapat dibatalkan.
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
