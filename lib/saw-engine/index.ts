import type {
  SawInput,
  SawOutput,
  SawCriterion,
  SawAlternative,
  SawResultRow,
  SawCriterionMeta,
  CriterionType,
} from "./types";

export * from "./types";

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** Normalisasi bobot agar Σw = 1. */
export function normalizeWeights(criteria: SawCriterion[]): {
  weightSum: number;
  normalized: Record<string, number>;
} {
  const weightSum = criteria.reduce((s, c) => s + c.weight, 0);
  const normalized: Record<string, number> = {};
  for (const c of criteria) {
    normalized[c.id] = weightSum === 0 ? 0 : c.weight / weightSum;
  }
  return { weightSum, normalized };
}

/** Hitung nilai max & min tiap kolom kriteria (untuk normalisasi). */
export function computeExtremes(
  criteria: SawCriterion[],
  alternatives: SawAlternative[],
): { max: Record<string, number>; min: Record<string, number> } {
  const max: Record<string, number> = {};
  const min: Record<string, number> = {};
  for (const c of criteria) {
    const vals = alternatives.map((a) => a.scores[c.id] ?? 0);
    max[c.id] = vals.length ? Math.max(...vals) : 0;
    min[c.id] = vals.length ? Math.min(...vals) : 0;
  }
  return { max, min };
}

/**
 * Normalisasi satu nilai sesuai tipe kriteria (SAW standar, Hwang & Yoon):
 * - BENEFIT: r = x / max(kolom)
 * - COST:    r = min(kolom) / x
 */
export function normalizeValue(
  value: number,
  type: CriterionType,
  max: number,
  min: number,
): number {
  if (type === "BENEFIT") {
    return max === 0 ? 0 : value / max;
  }
  return value === 0 ? 0 : min / value;
}

/**
 * Tie-break LAPIS 1 (leksikografis): saat skor akhir (V) dua pegawai seri,
 * bandingkan nilai ternormalisasi (r) pada kriteria berbobot tertinggi lebih
 * dahulu, lalu berturut-turut ke bobot lebih rendah.
 *
 * @param tieBreakOrder daftar kriteria yang sudah diurut bobot menurun.
 * @returns < 0 bila `a` lebih unggul (harus di atas), > 0 bila `b` lebih
 *          unggul, dan 0 bila seluruh kriteria identik (→ seri sejati).
 */
export function compareByCriteria(
  a: Pick<SawResultRow, "normalizedScores">,
  b: Pick<SawResultRow, "normalizedScores">,
  tieBreakOrder: SawCriterion[],
): number {
  for (const c of tieBreakOrder) {
    const ra = a.normalizedScores[c.id] ?? 0;
    const rb = b.normalizedScores[c.id] ?? 0;
    if (ra !== rb) return rb - ra; // nilai lebih tinggi → peringkat lebih baik
  }
  return 0;
}

/**
 * Orkestrasi penuh SAW: normalisasi bobot → matriks ternormalisasi →
 * skor terbobot → V_i → ranking (termasuk penanganan seri dua lapis).
 */
export function calculateSaw(input: SawInput): SawOutput {
  const { criteria, alternatives } = input;

  if (criteria.length === 0) {
    throw new Error("Tidak ada kriteria untuk perhitungan SAW.");
  }
  if (alternatives.length === 0) {
    throw new Error("Tidak ada alternatif (pegawai) untuk dihitung.");
  }

  const { weightSum, normalized: normWeights } = normalizeWeights(criteria);
  const { max, min } = computeExtremes(criteria, alternatives);

  const rows: Omit<SawResultRow, "rankPosition" | "tied">[] = alternatives.map(
    (alt) => {
      const aggregatedScores: Record<string, number> = {};
      const normalizedScores: Record<string, number> = {};
      const weightedScores: Record<string, number> = {};
      let finalScore = 0;

      for (const c of criteria) {
        const raw = alt.scores[c.id] ?? 0;
        const r = normalizeValue(raw, c.type, max[c.id], min[c.id]);
        const weighted = normWeights[c.id] * r;

        aggregatedScores[c.id] = raw;
        normalizedScores[c.id] = round6(r);
        weightedScores[c.id] = round6(weighted);
        finalScore += weighted;
      }

      return {
        employeeId: alt.employeeId,
        aggregatedScores,
        normalizedScores,
        weightedScores,
        finalScore: round6(finalScore),
        totalEvaluators: alt.totalEvaluators,
      };
    },
  );

  // Urutan kriteria untuk tie-break: bobot menurun, lalu kode menaik (deterministik).
  const tieBreakOrder: SawCriterion[] = [...criteria].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.code.localeCompare(b.code);
  });

  // === PROSES PERANKINGAN ===
  // Urutkan: (1) V menurun → (2) LAPIS 1 tie-break kriteria → (3) employeeId
  // sebagai penentu terakhir agar urutan array tetap deterministik saat seri sejati.
  rows.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    const byCriteria = compareByCriteria(a, b, tieBreakOrder);
    if (byCriteria !== 0) return byCriteria;
    return a.employeeId.localeCompare(b.employeeId);
  });

  // Tetapkan peringkat. LAPIS 2: pegawai yang benar-benar identik (V sama DAN
  // seluruh kriteria sama) mendapat peringkat yang sama (standard competition
  // ranking, mis. 1, 1, 3). Bila V sama tapi dipisah oleh kriteria → tie-break
  // (Lapis 1) sudah menentukan urutan, peringkat tetap unik.
  let tieBreakApplied = false;
  const results: SawResultRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const cur = rows[i];
    const prev = i > 0 ? rows[i - 1] : null;
    let rankPosition = i + 1;

    if (prev && prev.finalScore === cur.finalScore) {
      if (compareByCriteria(cur, prev, tieBreakOrder) === 0) {
        // seri sejati → ikuti peringkat pegawai sebelumnya
        rankPosition = results[i - 1].rankPosition;
      } else {
        // V seri tetapi terpisah oleh kriteria (Lapis 1 berperan)
        tieBreakApplied = true;
      }
    }

    results.push({ ...cur, rankPosition, tied: false });
  }

  // Tandai 'tied' untuk peringkat yang dihuni lebih dari satu pegawai.
  const rankCount = new Map<number, number>();
  for (const r of results) {
    rankCount.set(r.rankPosition, (rankCount.get(r.rankPosition) ?? 0) + 1);
  }
  for (const r of results) {
    r.tied = (rankCount.get(r.rankPosition) ?? 0) > 1;
  }

  const hasTrueTie = results.some((r) => r.tied);

  const criteriaMeta: SawCriterionMeta[] = criteria.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    weight: c.weight,
    normalizedWeight: round6(normWeights[c.id]),
    type: c.type,
    maxValue: max[c.id],
    minValue: min[c.id],
  }));

  return { results, criteriaMeta, weightSum, tieBreakApplied, hasTrueTie };
}
