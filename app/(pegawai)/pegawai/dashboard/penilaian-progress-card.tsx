import Link from "next/link";
import { eq } from "drizzle-orm";
import { ClipboardList, CheckCircle2, CalendarOff } from "lucide-react";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  getCurrentOpenPeriod,
  getMyProgressStats,
} from "@/lib/evaluation-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function PenilaianProgressCard() {
  // 1. Auth + employee
  const session = await auth();
  if (!session?.user) return null;

  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });
  if (!employee) return null;

  // 2. Periode aktif
  const period = await getCurrentOpenPeriod();

  // Tidak ada periode aktif → card informatif (atau ganti `return null` kalau mau disembunyikan)
  if (!period) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Penilaian Pegawai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarOff className="h-4 w-4" />
            Belum ada periode penilaian aktif.
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Progress
  const progress = await getMyProgressStats(employee.id, period.id);

  // Pegawai bukan evaluator pada periode ini → sembunyikan card
  if (progress.totalAssigned === 0) return null;

  const isComplete = progress.percentage === 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" />
          Penilaian Pegawai
        </CardTitle>
        <CardDescription>{period.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all ${
                isComplete ? "bg-green-600" : "bg-blue-600"
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums">
            {progress.submitted}/{progress.totalAssigned}
          </span>
        </div>

        {/* Status + CTA */}
        {isComplete ? (
          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Semua penilaian selesai
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/penilaian">Lihat</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {progress.notStarted > 0 || progress.inProgress > 0
                ? `${progress.totalAssigned - progress.submitted} rekan belum dinilai`
                : "Mulai menilai rekan kerja Anda"}
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard/penilaian">
                {progress.submitted > 0 || progress.inProgress > 0
                  ? "Lanjutkan"
                  : "Mulai Nilai"}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
