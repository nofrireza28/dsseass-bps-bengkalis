import Link from "next/link";
import { db } from "@/db";
import { criteria, subCriteria } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Info, AlertCircle, CheckCircle2, Plus, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getBlockingPeriod,
  formatBlockedMessage,
  getCurrentTotalLeafWeight,
} from "@/lib/criteria-helpers";

import { CriteriaList } from "./criteria-list";

export const dynamic = "force-dynamic";

export default async function KriteriaPage() {
  const allCriteria = await db
    .select()
    .from(criteria)
    .orderBy(asc(criteria.displayOrder));

  const allSubCriteria = await db
    .select()
    .from(subCriteria)
    .orderBy(asc(subCriteria.displayOrder));

  const subByParent = allSubCriteria.reduce(
    (acc, sub) => {
      if (!acc[sub.criteriaId]) acc[sub.criteriaId] = [];
      acc[sub.criteriaId].push(sub);
      return acc;
    },
    {} as Record<string, typeof allSubCriteria>,
  );

  // Hitung total leaf weight
  const totalLeafWeight = await getCurrentTotalLeafWeight();
  const isWeightValid = Math.abs(totalLeafWeight - 1.0) < 0.0001;

  // Gate periode
  const blocking = await getBlockingPeriod();
  const isLocked = !!blocking;

  // Hitung statistik
  const activeCriteria = allCriteria.filter((c) => c.isActive);
  const groupCount = activeCriteria.filter((c) => c.hasSubCriteria).length;
  const leafCount = activeCriteria.filter((c) => !c.hasSubCriteria).length;
  const totalSubItems = allSubCriteria.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Kriteria
          </h1>
          <p className="text-muted-foreground mt-1">
            Kriteria penilaian pegawai (model leaf-based)
          </p>
        </div>
        <Button
          asChild
          disabled={isLocked}
          className="bg-bps-primary hover:bg-bps-primary/90"
        >
          {isLocked ? (
            <span className="inline-flex items-center cursor-not-allowed opacity-50 px-4 py-2 rounded-md">
              <Lock className="mr-2 h-4 w-4" />
              Tambah Kriteria
            </span>
          ) : (
            <Link href="/admin/kriteria/new">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kriteria
            </Link>
          )}
        </Button>
      </div>

      {/* Lock warning */}
      {isLocked && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-destructive">
              <p className="font-medium">Modifikasi Kriteria Terkunci</p>
              <p className="mt-1">{formatBlockedMessage(blocking!)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <Card className={isWeightValid ? "" : "border-destructive"}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {isWeightValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium">
                Total Bobot Leaf:{" "}
                <span
                  className={
                    isWeightValid ? "text-green-600" : "text-destructive"
                  }
                >
                  {(totalLeafWeight * 100).toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {activeCriteria.length} kriteria aktif ({groupCount} grup +{" "}
                {leafCount} leaf) · {totalSubItems} sub-kriteria
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-blue-900">
            <strong>Model Leaf-Based:</strong> Bobot setiap &quot;leaf
            item&quot; (sub-kriteria dari grup, atau kriteria yang dinilai
            langsung) bersifat absolut. Total semua bobot leaf harus 100%.
            Kriteria induk grup hanya pengelompokan informatif — bobotnya =
            jumlah sub-nya.
          </div>
        </div>
      </div>

      {/* Daftar kriteria */}
      <CriteriaList
        criteria={allCriteria.map((c) => ({
          ...c,
          weight: parseFloat(c.weight),
          subs: (subByParent[c.id] ?? []).map((s) => ({
            ...s,
            weight: parseFloat(s.weight),
          })),
        }))}
        isLocked={isLocked}
      />
    </div>
  );
}
