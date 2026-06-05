// Pure calculation functions — TANPA import db, aman dipakai di client & server.

export interface PeriodMonth {
  month: number; // nomor bulan kalender (1-12)
  label: string; // "Oktober"
  labelWithYear: string; // "Oktober 2025"
}

export interface ObjectiveRawData {
  monthlyScores?: Record<string, number>; // MONTHLY_AVERAGE (CKP)
  monthlyKjk?: Record<string, number>; // ABSENCE_THRESHOLD (ABSENSI)
  directScore?: number; // DIRECT
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getMonthsBetween(start: Date, end: Date): number[] {
  const months: number[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push(cur.getMonth() + 1);
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

/**
 * Tentukan bulan-bulan yang harus diinput berdasarkan tipe periode.
 */
export function getPeriodMonths(
  periodType: string,
  year: number,
  periodIndex: number | null,
  startDate?: Date | string | null,
  endDate?: Date | string | null,
): PeriodMonth[] {
  let months: number[] = [];

  switch (periodType) {
    case "MONTHLY":
      months = periodIndex ? [periodIndex] : [];
      break;
    case "QUARTERLY":
      if (periodIndex) {
        const start = (periodIndex - 1) * 3 + 1;
        months = [start, start + 1, start + 2];
      }
      break;
    case "SEMESTER":
      if (periodIndex) {
        const start = (periodIndex - 1) * 6 + 1;
        months = Array.from({ length: 6 }, (_, i) => start + i);
      }
      break;
    case "ANNUAL":
      months = Array.from({ length: 12 }, (_, i) => i + 1);
      break;
    case "CUSTOM":
      if (startDate && endDate) {
        months = getMonthsBetween(new Date(startDate), new Date(endDate));
      }
      break;
  }

  return months.map((m) => ({
    month: m,
    label: MONTH_NAMES_ID[m - 1] ?? `Bulan ${m}`,
    labelWithYear: `${MONTH_NAMES_ID[m - 1] ?? `Bulan ${m}`} ${year}`,
  }));
}

/**
 * CKP: rata-rata sederhana nilai bulanan. Range per bulan 0–100.
 */
export function calculateCkpScore(
  monthlyScores: Record<string, number>,
): number {
  const values = Object.values(monthlyScores).filter(
    (v) => v != null && !Number.isNaN(v),
  );
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 100) / 100;
}

/**
 * Konversi TOTAL akumulasi KJK (menit) → skor. Threshold sesuai kertas kerja BPS.
 */
export function kjkToScore(totalKjk: number): number {
  if (totalKjk === 0) return 100;
  if (totalKjk <= 50) return 90;
  if (totalKjk <= 100) return 80;
  return 70;
}

/**
 * ABSENSI: jumlahkan KJK semua bulan → terapkan threshold pada total.
 */
export function calculateAbsenceScore(
  monthlyKjk: Record<string, number>,
): number {
  const values = Object.values(monthlyKjk).filter(
    (v) => v != null && !Number.isNaN(v),
  );
  const totalKjk = values.reduce((a, b) => a + b, 0);
  return kjkToScore(totalKjk);
}

/**
 * Dispatcher: hitung final score berdasarkan calculation_type.
 */
export function calculateObjectiveScore(
  calculationType: string | null,
  rawData: ObjectiveRawData,
): number | null {
  switch (calculationType) {
    case "MONTHLY_AVERAGE":
      return calculateCkpScore(rawData.monthlyScores ?? {});
    case "ABSENCE_THRESHOLD":
      return calculateAbsenceScore(rawData.monthlyKjk ?? {});
    case "DIRECT":
      return rawData.directScore ?? null;
    default:
      return null;
  }
}
