"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CriterionCol {
  id: string;
  code: string;
  name: string;
}

interface ReportRow {
  rankPosition: number;
  employeeName: string;
  employeePosition?: string | null;
  aggregatedScores: Record<string, number>;
  finalScore: string; // numeric dari DB → string (Drizzle)
}

interface Props {
  periodName: string;
  criteria: CriterionCol[];
  rows: ReportRow[]; // sudah terurut peringkat
}

export function LaporanNilaiTable({ periodName, criteria, rows }: Props) {
  const [busy, setBusy] = useState(false);

  // Status seri diturunkan dari rankPosition yang dihuni lebih dari satu pegawai.
  const rankCount = rows.reduce<Record<number, number>>((acc, r) => {
    acc[r.rankPosition] = (acc[r.rankPosition] ?? 0) + 1;
    return acc;
  }, {});
  const isTied = (rank: number) => (rankCount[rank] ?? 0) > 1;

  const fileBase = `Laporan-Nilai-${periodName.replace(/\s+/g, "_")}`;

  // Susun header + baris untuk keperluan export (urutan kolom konsisten dgn tabel).
  const buildMatrix = () => {
    const header = [
      "Peringkat",
      "Nama",
      ...criteria.map((c) => c.code),
      "Skor Akhir (V)",
    ];
    const body = rows.map((r) => [
      isTied(r.rankPosition) ? `${r.rankPosition} (seri)` : `${r.rankPosition}`,
      r.employeeName,
      ...criteria.map((c) =>
        Number((r.aggregatedScores[c.id] ?? 0).toFixed(2)),
      ),
      Number(parseFloat(r.finalScore).toFixed(6)),
    ]);
    return { header, body };
  };

  const exportExcel = async () => {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const { header, body } = buildMatrix();
      const aoa = [
        [`Laporan Daftar Nilai Pegawai — ${periodName}`],
        [`Metode SAW · ${rows.length} pegawai`],
        [],
        header,
        ...body,
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daftar Nilai");
      XLSX.writeFile(wb, `${fileBase}.xlsx`);
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const { header, body } = buildMatrix();
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(12);
      doc.text(`Laporan Daftar Nilai Pegawai — ${periodName}`, 40, 36);
      doc.setFontSize(9);
      doc.text(`Metode SAW · ${rows.length} pegawai`, 40, 50);

      autoTable(doc, {
        head: [header],
        body: body.map((row) => row.map((cell) => String(cell))),
        startY: 62,
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [30, 64, 175] }, // biru
        columnStyles: { 0: { halign: "center" }, 1: { halign: "left" } },
      });

      doc.save(`${fileBase}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Daftar Nilai — {periodName}</CardTitle>
          <CardDescription>
            {rows.length} pegawai · nilai per kriteria, skor akhir (V), dan
            peringkat
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            disabled={busy || rows.length === 0}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPdf}
            disabled={busy || rows.length === 0}
          >
            <FileText className="mr-1 h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Rank</TableHead>
              <TableHead>Nama</TableHead>
              {criteria.map((c) => (
                <TableHead
                  key={c.id}
                  className="whitespace-nowrap text-right"
                  title={c.name}
                >
                  {c.code}
                </TableHead>
              ))}
              <TableHead className="text-right">V</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.rankPosition}-${r.employeeName}`}>
                <TableCell className="text-center font-medium">
                  {r.rankPosition}
                  {isTied(r.rankPosition) ? " *" : ""}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {r.employeeName}
                  {r.employeePosition && (
                    <div className="text-xs text-muted-foreground">
                      {r.employeePosition}
                    </div>
                  )}
                </TableCell>
                {criteria.map((c) => (
                  <TableCell key={c.id} className="text-right tabular-nums">
                    {(r.aggregatedScores[c.id] ?? 0).toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono tabular-nums">
                  {parseFloat(r.finalScore).toFixed(6)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.some((r) => isTied(r.rankPosition)) && (
          <p className="mt-2 text-xs text-muted-foreground">
            * terdapat peringkat seri
          </p>
        )}
      </CardContent>
    </Card>
  );
}
