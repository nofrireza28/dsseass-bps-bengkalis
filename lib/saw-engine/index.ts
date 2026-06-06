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
 * Orkestrasi penuh SAW: normalisasi bobot → matriks ternormalisasi →
 * skor terbobot → V_i → ranking.
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

  const rows: Omit<SawResultRow, "rankPosition">[] = alternatives.map((alt) => {
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
  });

  // Urutkan: V_i menurun, tie-break employeeId (deterministik)
  rows.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.employeeId.localeCompare(b.employeeId);
  });

  const results: SawResultRow[] = rows.map((r, i) => ({
    ...r,
    rankPosition: i + 1,
  }));

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

  return { results, criteriaMeta, weightSum };
}
