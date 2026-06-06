import { calculateSaw } from "@/lib/saw-engine";

const out = calculateSaw({
  criteria: [
    { id: "c1", code: "C1", name: "Kriteria 1", weight: 60, type: "BENEFIT" },
    { id: "c2", code: "C2", name: "Kriteria 2", weight: 40, type: "BENEFIT" },
  ],
  alternatives: [
    { employeeId: "A", scores: { c1: 90, c2: 80 }, totalEvaluators: 5 },
    { employeeId: "B", scores: { c1: 100, c2: 70 }, totalEvaluators: 5 },
    { employeeId: "C", scores: { c1: 80, c2: 100 }, totalEvaluators: 5 },
  ],
});

console.table(
  out.results.map((r) => ({
    rank: r.rankPosition,
    employee: r.employeeId,
    V: r.finalScore,
  })),
);
// Harapan: #1 B (0.88), #2 C (0.88), #3 A (0.86)
