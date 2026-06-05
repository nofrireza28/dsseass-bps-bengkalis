import { eq } from "drizzle-orm";
import { ClipboardList, CheckCircle, Clock } from "lucide-react";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  getCurrentOpenPeriod,
  getMyProgressStats,
} from "@/lib/evaluation-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function PenilaianStatsCards() {
  const session = await auth();

  // Default (kondisi tanpa data)
  let periodName: string | null = null;
  let totalAssigned = 0;
  let submitted = 0;
  let pending = 0;
  let hasAssignment = false;

  if (session?.user) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    });

    if (employee) {
      const period = await getCurrentOpenPeriod();
      if (period) {
        periodName = period.name;
        const progress = await getMyProgressStats(employee.id, period.id);
        totalAssigned = progress.totalAssigned;
        submitted = progress.submitted;
        pending = progress.totalAssigned - progress.submitted;
        hasAssignment = progress.totalAssigned > 0;
      }
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Penilaian Aktif */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Penilaian Aktif</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {hasAssignment ? totalAssigned : "--"}
          </div>
          <p className="text-xs text-muted-foreground">
            {periodName ?? "Belum ada periode aktif"}
          </p>
        </CardContent>
      </Card>

      {/* Sudah Dinilai */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sudah Dinilai</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {hasAssignment ? submitted : "--"}
          </div>
          <p className="text-xs text-muted-foreground">Rekan kerja</p>
        </CardContent>
      </Card>

      {/* Belum Dinilai */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Belum Dinilai</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {hasAssignment ? pending : "--"}
          </div>
          <p className="text-xs text-muted-foreground">Rekan kerja</p>
        </CardContent>
      </Card>
    </div>
  );
}
