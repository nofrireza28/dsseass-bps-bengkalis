"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, ClipboardList, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { GroupForm } from "../group-form";
import { LeafForm } from "../leaf-form";

type CriteriaType = "GROUP" | "LEAF" | null;

interface NewCriteriaPickerProps {
  otherLeafWeight: number;
  isLocked: boolean;
  lockReason: string | null;
}

export function NewCriteriaPicker({
  otherLeafWeight,
  isLocked,
  lockReason,
}: NewCriteriaPickerProps) {
  const [chosen, setChosen] = useState<CriteriaType>(null);

  // Kalau sudah pilih, render form-nya
  if (chosen === "GROUP") {
    return (
      <GroupForm
        mode="create"
        otherLeafWeight={otherLeafWeight}
        isLocked={isLocked}
        lockReason={lockReason}
        hasFinalizedPeriods={false}
      />
    );
  }

  if (chosen === "LEAF") {
    return (
      <LeafForm
        mode="create"
        otherLeafWeight={otherLeafWeight}
        isLocked={isLocked}
        lockReason={lockReason}
        hasFinalizedPeriods={false}
      />
    );
  }

  // Picker view
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/kriteria">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tambah Kriteria</h1>
          <p className="text-muted-foreground mt-1">
            Pilih jenis kriteria yang akan dibuat
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-destructive">
              <p className="font-medium">Tidak Dapat Menambah Kriteria</p>
              <p className="mt-1">{lockReason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pilihan GRUP */}
        <Card
          className={`cursor-pointer transition-all hover:border-blue-400 hover:shadow-md ${
            isLocked ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => !isLocked && setChosen("GROUP")}
        >
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Kriteria GRUP</h3>
                <p className="text-xs text-muted-foreground">
                  Punya sub-kriteria
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Kriteria yang berfungsi sebagai pengelompokan. Yang dinilai
                adalah sub-kriterianya melalui penilaian multi-rater (rekan
                kerja).
              </p>
              <div className="border-t pt-2">
                <p className="font-medium text-foreground">Contoh dari BPS:</p>
                <ul className="list-disc list-inside text-xs mt-1">
                  <li>PROFESIONAL (3 sub)</li>
                  <li>INTEGRITAS (3 sub)</li>
                  <li>AMANAH (3 sub)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pilihan LEAF */}
        <Card
          className={`cursor-pointer transition-all hover:border-purple-400 hover:shadow-md ${
            isLocked ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => !isLocked && setChosen("LEAF")}
        >
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100">
                <ClipboardList className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Kriteria LEAF</h3>
                <p className="text-xs text-muted-foreground">
                  Dinilai langsung, tanpa sub
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Kriteria yang dinilai langsung pada level induk. Bisa dinilai
                multi-rater atau diinput langsung oleh panitia berdasarkan data
                objektif.
              </p>
              <div className="border-t pt-2">
                <p className="font-medium text-foreground">Contoh dari BPS:</p>
                <ul className="list-disc list-inside text-xs mt-1">
                  <li>CKP (rata-rata kinerja bulanan)</li>
                  <li>ABSENSI (konversi dari KJK menit)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-sm text-muted-foreground italic text-center">
        Klik salah satu jenis kriteria untuk melanjutkan
      </div>
    </div>
  );
}
