export type CriterionType = "BENEFIT" | "COST";

/** Satu kolom kriteria leaf (bisa berasal dari sub_criteria atau criteria objektif). */
export interface SawCriterion {
  id: string; // kunci unik kolom (sub_criteria.id atau criteria.id)
  code: string; // mis. "PRO-1", "CKP"
  name: string;
  weight: number; // bobot asli (mis. 5, 15, 20) — dinormalisasi di dalam engine
  type: CriterionType;
}

/** Satu alternatif (pegawai) dengan nilai mentah teragregasi per kriteria. */
export interface SawAlternative {
  employeeId: string;
  scores: Record<string, number>; // keyed by SawCriterion.id → nilai mentah
  totalEvaluators: number; // jumlah penilai (untuk transparansi)
}

export interface SawInput {
  criteria: SawCriterion[];
  alternatives: SawAlternative[];
}

export interface SawResultRow {
  employeeId: string;
  aggregatedScores: Record<string, number>; // nilai mentah (x_ij)
  normalizedScores: Record<string, number>; // r_ij
  weightedScores: Record<string, number>; // w_j * r_ij
  finalScore: number; // V_i ∈ [0,1]
  rankPosition: number; // 1 = terbaik
  totalEvaluators: number;
}

export interface SawCriterionMeta {
  id: string;
  code: string;
  name: string;
  weight: number;
  normalizedWeight: number; // w_j / Σw
  type: CriterionType;
  maxValue: number; // max kolom
  minValue: number; // min kolom
}

export interface SawOutput {
  results: SawResultRow[]; // sudah terurut by rankPosition
  criteriaMeta: SawCriterionMeta[];
  weightSum: number;
}
