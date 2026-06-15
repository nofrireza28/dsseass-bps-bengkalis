import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getPeriodsWithRanking,
  getCurrentRanking,
} from "@/lib/ranking-helpers";
import { LaporanNilaiTable } from "./laporan-nilai-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function LaporanNilai({
  basePath,
  periodId,
}: {
  basePath: string;
  periodId?: string;
}) {
  const periods = await getPeriodsWithRanking();
  const selected =
    periodId && periods.some((p) => p.id === periodId) ? periodId : undefined;
  const selectedPeriod = periods.find((p) => p.id === selected);
  const ranking = selected ? await getCurrentRanking(selected) : null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={basePath}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Laporan Daftar Nilai Keseluruhan</h1>
        <p className="text-sm text-muted-foreground">
          Rekap nilai seluruh pegawai per kriteria, skor akhir (V), dan
          peringkat untuk periode terpilih.
        </p>
      </div>

      {/* Pemilih periode — form GET (submit menambahkan ?periodId pada URL) */}
      <form className="flex flex-wrap items-center gap-2">
        <select
          name="periodId"
          defaultValue={selected ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Pilih periode…
          </option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.status}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Tampilkan
        </Button>
      </form>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada periode yang memiliki hasil perhitungan ranking.
          </CardContent>
        </Card>
      ) : !selected ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pilih periode di atas untuk menampilkan laporan.
          </CardContent>
        </Card>
      ) : !ranking ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Data hasil untuk periode ini tidak ditemukan.
          </CardContent>
        </Card>
      ) : (
        <LaporanNilaiTable
          periodName={selectedPeriod?.name ?? "-"}
          criteria={ranking.calculation.metadata.criteria.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
          }))}
          rows={ranking.results.map((r) => ({
            rankPosition: r.rankPosition,
            employeeName: r.employeeName,
            employeePosition: r.employeePosition,
            aggregatedScores: r.aggregatedScores,
            finalScore: r.finalScore,
          }))}
        />
      )}
    </div>
  );
}
