import Link from "next/link";
import { FileSpreadsheet, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReportItem {
  title: string;
  description: string;
  path: string; // relatif terhadap basePath
  available: boolean;
}

// Daftar laporan. Tambahkan entri baru di sini setelah Seminar Hasil
// (mis. laporan resmi naratif, berita acara, dsb).
const REPORTS: ReportItem[] = [
  {
    title: "Daftar Nilai Keseluruhan",
    description:
      "Rekap nilai seluruh pegawai per kriteria beserta skor akhir (V) dan peringkat untuk satu periode. Dapat diekspor ke Excel dan PDF.",
    path: "/nilai",
    available: true,
  },
  // Contoh placeholder laporan masa depan:
  // {
  //   title: "Laporan Resmi Hasil Pemilihan",
  //   description: "Dokumen laporan resmi untuk diserahkan ke Kepala BPS.",
  //   path: "/resmi",
  //   available: false,
  // },
];

export function LaporanList({ basePath }: { basePath: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-sm text-muted-foreground">
          Daftar laporan yang tersedia pada sistem.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.path} className={r.available ? "" : "opacity-60"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4 text-bps-primary" />
                {r.title}
              </CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {r.available ? (
                <Button asChild className="w-full">
                  <Link href={`${basePath}${r.path}`}>
                    Buka Laporan
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="secondary" className="w-full">
                  Segera hadir
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
