import Link from "next/link";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Plus, Calendar, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PeriodsList } from "./periods-list";

export const dynamic = "force-dynamic";

export default async function PeriodePage() {
  const periods = await db
    .select()
    .from(evaluationPeriods)
    .orderBy(desc(evaluationPeriods.year), desc(evaluationPeriods.periodIndex));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Periode
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola periode penilaian pegawai
          </p>
        </div>
        <Button asChild className="bg-bps-primary hover:bg-bps-primary/90">
          <Link href="/admin/periode/new">
            <Plus className="mr-2 h-4 w-4" />
            Buat Periode
          </Link>
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-md border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-blue-900">
            <strong>Workflow Periode:</strong>{" "}
            <code className="text-xs bg-blue-100 px-1 rounded">DRAFT</code> →{" "}
            <code className="text-xs bg-blue-100 px-1 rounded">OPEN</code> →{" "}
            <code className="text-xs bg-blue-100 px-1 rounded">CLOSED</code> →{" "}
            <code className="text-xs bg-blue-100 px-1 rounded">
              AWAITING_APPROVAL
            </code>{" "}
            →{" "}
            <code className="text-xs bg-blue-100 px-1 rounded">FINALIZED</code>.
            Hanya 1 periode boleh aktif dalam satu waktu.
          </div>
        </div>
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum Ada Periode</h3>
            <p className="text-muted-foreground mb-6">
              Buat periode penilaian pertama untuk memulai proses evaluasi
            </p>
            <Button asChild className="bg-bps-primary hover:bg-bps-primary/90">
              <Link href="/admin/periode/new">
                <Plus className="mr-2 h-4 w-4" />
                Buat Periode Pertama
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PeriodsList periods={periods} />
      )}
    </div>
  );
}
