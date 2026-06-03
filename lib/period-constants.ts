// ============== KONSTANTA ==============

export const PERIOD_TYPES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMESTER",
  "ANNUAL",
  "CUSTOM",
] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const PERIOD_STATUSES = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "AWAITING_APPROVAL",
  "FINALIZED",
] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  MONTHLY: "Bulanan",
  QUARTERLY: "Triwulanan",
  SEMESTER: "Semesteran",
  ANNUAL: "Tahunan",
  CUSTOM: "Custom",
};

export const STATUS_LABELS: Record<PeriodStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Berjalan",
  CLOSED: "Tutup",
  AWAITING_APPROVAL: "Menunggu Pengesahan",
  FINALIZED: "Disahkan",
};

export const STATUS_COLORS: Record<PeriodStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  OPEN: "bg-green-100 text-green-700 border-green-300",
  CLOSED: "bg-blue-100 text-blue-700 border-blue-300",
  AWAITING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-300",
  FINALIZED: "bg-purple-100 text-purple-700 border-purple-300",
};

export const MONTH_NAMES = [
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

const ROMAN_NUMERALS: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
};

/**
 * Hitung tanggal default berdasarkan tipe periode.
 * Return null untuk CUSTOM (admin input manual).
 */
export function calculateDefaultDates(
  periodType: PeriodType,
  year: number,
  periodIndex: number | null,
): { start: string; end: string } | null {
  if (periodType === "CUSTOM") return null;

  let start: Date;
  let end: Date;

  switch (periodType) {
    case "MONTHLY":
      if (!periodIndex || periodIndex < 1 || periodIndex > 12) return null;
      start = new Date(year, periodIndex - 1, 1);
      end = new Date(year, periodIndex, 0);
      break;
    case "QUARTERLY":
      if (!periodIndex || periodIndex < 1 || periodIndex > 4) return null;
      start = new Date(year, (periodIndex - 1) * 3, 1);
      end = new Date(year, periodIndex * 3, 0);
      break;
    case "SEMESTER":
      if (!periodIndex || periodIndex < 1 || periodIndex > 2) return null;
      start = new Date(year, (periodIndex - 1) * 6, 1);
      end = new Date(year, periodIndex * 6, 0);
      break;
    case "ANNUAL":
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      break;
    default:
      return null;
  }

  return {
    start: formatDateISO(start),
    end: formatDateISO(end),
  };
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateDefaultName(
  periodType: PeriodType,
  year: number,
  periodIndex: number | null,
): string {
  switch (periodType) {
    case "MONTHLY":
      if (!periodIndex) return "";
      return `${MONTH_NAMES[periodIndex - 1]} ${year}`;
    case "QUARTERLY":
      if (!periodIndex) return "";
      return `Triwulan ${ROMAN_NUMERALS[periodIndex] ?? periodIndex} ${year}`;
    case "SEMESTER":
      if (!periodIndex) return "";
      return `Semester ${periodIndex} ${year}`;
    case "ANNUAL":
      return `Tahun ${year}`;
    case "CUSTOM":
      return "";
    default:
      return "";
  }
}

export function formatPeriodDateRange(
  start: string | Date,
  end: string | Date,
): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  return `${startDate.toLocaleDateString("id-ID", opts)} – ${endDate.toLocaleDateString("id-ID", opts)}`;
}
