import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { evaluationPeriods, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Clock,
  User,
  FileText,
  Users,
  ChevronRight,
  AlertCircle,
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
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PERIOD_TYPE_LABELS,
  formatPeriodDateRange,
  type PeriodStatus,
  type PeriodType,
} from "@/lib/period-constants";
import {
  getParticipantCount,
  getAvailableEmployeeCount,
} from "@/lib/participant-helpers";
import {
  validatePreOpen,
  validatePreClose,
} from "@/lib/period-validation-helpers";
import { OpenPeriodDialog } from "./open-period-dialog";
import { ClosePeriodDialog } from "./close-period-dialog";
import { getPeriodCompletionStats } from "@/lib/period-completion-helpers";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

async function getEmployeeName(
  employeeId: string | null,
): Promise<string | null> {
  if (!employeeId) return null;
  const emp = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
    columns: { fullName: true },
  });
  return emp?.fullName ?? null;
}

function formatDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PeriodDetailPage({ params }: DetailPageProps) {
  const { id } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, id),
  });

  if (!period) {
    notFound();
  }

  const status = period.status as PeriodStatus;
  const periodType = period.periodType as PeriodType;
  const isDraft = period.status === "DRAFT";

  // Load employee names untuk audit trail
  const [createdByName, openedByName, closedByName, finalizedByName] =
    await Promise.all([
      getEmployeeName(period.createdBy),
      getEmployeeName(period.openedBy),
      getEmployeeName(period.closedBy),
      getEmployeeName(period.finalizedBy),
    ]);

  const [participantCount, availableCount] = await Promise.all([
    getParticipantCount(period.id),
    getAvailableEmployeeCount(period.id),
  ]);

  // Fetch validation hanya kalau status DRAFT (untuk dialog buka periode)
  const validation =
    period.status === "DRAFT" ? await validatePreOpen(period.id) : null;

  const preCloseValidation =
    period.status === "OPEN" ? await validatePreClose(period.id) : null;

  const completionStats =
    period.status === "DRAFT"
      ? null
      : (preCloseValidation?.stats ??
        (await getPeriodCompletionStats(period.id)));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/periode">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{period.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={STATUS_COLORS[status]}>
              {STATUS_LABELS[status]}
            </Badge>
            <Badge variant="outline">{PERIOD_TYPE_LABELS[periodType]}</Badge>
            <Badge variant="outline">{period.year}</Badge>
          </div>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/periode/${period.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            {validation && (
              <OpenPeriodDialog
                periodId={period.id}
                periodName={period.name}
                validation={validation}
              />
            )}
          </div>
        )}
      </div>

      {/* Informasi Periode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informasi Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Nama</dt>
              <dd className="font-medium mt-0.5">{period.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Tipe Periode</dt>
              <dd className="font-medium mt-0.5">
                {PERIOD_TYPE_LABELS[periodType]}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Tahun</dt>
              <dd className="font-medium mt-0.5">{period.year}</dd>
            </div>
            {period.periodIndex !== null && (
              <div>
                <dt className="text-sm text-muted-foreground">Index Periode</dt>
                <dd className="font-medium mt-0.5">{period.periodIndex}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Rentang Penilaian
              </dt>
              <dd className="font-medium mt-0.5">
                {formatPeriodDateRange(period.startDate, period.endDate)}
              </dd>
            </div>
            {period.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Deskripsi</dt>
                <dd className="mt-0.5">{period.description}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      {completionStats && (
        <Card>
          <CardHeader>
            <CardTitle>
              {period.status === "OPEN"
                ? "Status & Aksi Periode"
                : "Ringkasan Kelengkapan Penilaian"}
            </CardTitle>
            <CardDescription>
              {period.status === "OPEN"
                ? "Periode sedang berjalan. Pantau progres dan tutup setelah 100%."
                : "Periode sudah ditutup. Data bersifat baca-saja."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Subjektif */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Penilaian Subjektif (Multi-Rater)
                </span>
                <span className="text-muted-foreground">
                  {completionStats.submittedEvaluations}/
                  {completionStats.totalEvaluations} (
                  {completionStats.subjectivePercentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${
                    completionStats.subjectivePercentage === 100
                      ? "bg-green-600"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${completionStats.subjectivePercentage}%` }}
                />
              </div>
            </div>

            {/* Progress Objektif */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Penilaian Objektif (CKP, Absensi)
                </span>
                <span className="text-muted-foreground">
                  {completionStats.filledObjectiveScores}/
                  {completionStats.totalObjectiveScores} (
                  {completionStats.objectivePercentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${
                    completionStats.objectivePercentage === 100
                      ? "bg-green-600"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${completionStats.objectivePercentage}%` }}
                />
              </div>
            </div>

            {/* Links — tetap relevan untuk semua status non-DRAFT */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/periode/${period.id}/kelengkapan`}>
                  Lihat Detail Kelengkapan
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/admin/periode/${period.id}/evaluasi`}>
                  Audit Penilaian
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/admin/periode/${period.id}/penilaian-objektif`}>
                  Penilaian Objektif
                </Link>
              </Button>

              {period.status !== "OPEN" && period.status !== "DRAFT" && (
                <Button variant="default" asChild>
                  <Link href={`/admin/periode/${period.id}/ranking`}>
                    Hasil Ranking
                  </Link>
                </Button>
              )}

              {/* Tombol Tutup HANYA saat OPEN */}
              {period.status === "OPEN" && preCloseValidation && (
                <ClosePeriodDialog
                  periodId={period.id}
                  validation={preCloseValidation}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Riwayat Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AuditRow
              label="Dibuat"
              timestamp={period.createdAt}
              actor={createdByName}
              active
            />
            <AuditRow
              label="Dibuka (DRAFT → OPEN)"
              timestamp={period.openedAt}
              actor={openedByName}
              active={!!period.openedAt}
            />
            <AuditRow
              label="Ditutup (OPEN → CLOSED)"
              timestamp={period.closedAt}
              actor={closedByName}
              active={!!period.closedAt}
            />
            <AuditRow
              label="Menunggu Pengesahan (CLOSED → AWAITING_APPROVAL)"
              timestamp={period.awaitingApprovalAt}
              actor={null}
              active={!!period.awaitingApprovalAt}
            />
            <AuditRow
              label="Disahkan (AWAITING_APPROVAL → FINALIZED)"
              timestamp={period.finalizedAt}
              actor={finalizedByName}
              active={!!period.finalizedAt}
            />
          </div>
          {period.approvalNotes && (
            <div className="mt-4 pt-4 border-t">
              <dt className="text-sm text-muted-foreground">
                Catatan Pengesahan:
              </dt>
              <dd className="mt-1">{period.approvalNotes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partisipan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Partisipan Periode
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/periode/${period.id}/partisipan`}>
                Kelola
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {participantCount === 0 ? (
            <div className="rounded-md border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-amber-900">
                  <p className="font-medium">Belum Ada Partisipan</p>
                  <p className="mt-1">
                    Periode ini belum memiliki partisipan. Tambahkan pegawai
                    sebelum membuka periode untuk penilaian.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-bold">{participantCount}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Partisipan
                </p>
              </div>
              {availableCount > 0 && period.status === "DRAFT" && (
                <div>
                  <div className="text-3xl font-bold text-amber-600">
                    {availableCount}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pegawai aktif belum ditambahkan
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder: Progress Penilaian */}
      {/* <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">
            <strong>Dashboard Progress Penilaian</strong> akan ditampilkan di
            sini setelah Tahap 5 selesai.
          </p>
        </CardContent>
      </Card> */}
    </div>
  );
}

function AuditRow({
  label,
  timestamp,
  actor,
  active,
}: {
  label: string;
  timestamp: Date | null;
  actor: string | null;
  active: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${active ? "" : "opacity-40"}`}>
      <div
        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
          active ? "bg-bps-primary" : "bg-gray-300"
        }`}
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {timestamp ? formatDateTime(timestamp) : "Belum"}
          {actor && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {actor}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
