import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Circle,
  ClipboardList,
  CalendarOff,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  getCurrentOpenPeriod,
  getMyEvaluationsAsEvaluator,
  getMyProgressStats,
  type EvaluationListItem,
} from "@/lib/evaluation-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PenilaianPage() {
  // 1. Auth
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 2. Get employee dari session
  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });

  if (!employee) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="text-muted-foreground">
          Data pegawai tidak ditemukan untuk akun Anda. Hubungi admin.
        </p>
      </div>
    );
  }

  // 3. Get periode aktif
  const period = await getCurrentOpenPeriod();

  // Empty state: tidak ada periode OPEN
  if (!period) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Penilaian Pegawai</h1>
          <p className="text-sm text-muted-foreground">
            Beri penilaian untuk rekan kerja Anda.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarOff className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium">Tidak ada periode penilaian aktif</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Saat ini belum ada periode penilaian yang dibuka. Anda akan dapat
              mengisi penilaian setelah admin membuka periode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Get evaluations + progress
  const [evaluationsList, progress] = await Promise.all([
    getMyEvaluationsAsEvaluator(employee.id, period.id),
    getMyProgressStats(employee.id, period.id),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Penilaian Pegawai</h1>
        <p className="text-sm text-muted-foreground">
          Periode: <span className="font-medium">{period.name}</span>
        </p>
      </div>

      {/* Progress summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progres Penilaian Anda</CardTitle>
          <CardDescription>
            {progress.submitted} dari {progress.totalAssigned} rekan kerja sudah
            dinilai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all ${
                  progress.percentage === 100 ? "bg-green-600" : "bg-blue-600"
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums">
              {progress.percentage}%
            </span>
          </div>
          {progress.percentage === 100 ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Semua penilaian sudah selesai. Terima kasih!
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>✅ Selesai: {progress.submitted}</span>
              <span>⏳ Sedang diisi: {progress.inProgress}</span>
              <span>⚪ Belum mulai: {progress.notStarted}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List evaluatees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Daftar Rekan untuk Dinilai
          </CardTitle>
          <CardDescription>
            Klik tombol di setiap baris untuk mulai atau melanjutkan penilaian.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluationsList.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Anda tidak terdaftar sebagai penilai pada periode ini.
            </p>
          ) : (
            <ul className="divide-y">
              {evaluationsList.map((item) => (
                <EvaluateeRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Row component (server, no interactivity — pure render)
// ============================================================
function EvaluateeRow({ item }: { item: EvaluationListItem }) {
  const isSubmitted = item.status === "SUBMITTED";
  const isInProgress = !isSubmitted && item.filledScores > 0;
  const isNotStarted = !isSubmitted && item.filledScores === 0;

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.evaluateeName}</p>
        {item.evaluateePosition && (
          <p className="truncate text-xs text-muted-foreground">
            {item.evaluateePosition}
          </p>
        )}
        {/* Progress mini (hanya kalau belum submit) */}
        {!isSubmitted && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${item.progressPercentage}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {item.filledScores}/{item.totalScores}
            </span>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="shrink-0">
        {isSubmitted ? (
          <Badge
            variant="outline"
            className="border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Selesai
          </Badge>
        ) : isInProgress ? (
          <Badge
            variant="outline"
            className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
          >
            <Clock className="mr-1 h-3 w-3" />
            Sedang Diisi
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            <Circle className="mr-1 h-3 w-3" />
            Belum Mulai
          </Badge>
        )}
      </div>

      {/* Action button */}
      <div className="shrink-0">
        <Button variant={isSubmitted ? "outline" : "default"} size="sm" asChild>
          <Link href={`/pegawai/penilaian/${item.id}`}>
            {isSubmitted ? "Lihat" : isNotStarted ? "Mulai Nilai" : "Lanjutkan"}
          </Link>
        </Button>
      </div>
    </li>
  );
}
