import { clearMatrixForPeriod } from "@/lib/matrix-generator";

async function main() {
  const periodId = process.argv[2];
  if (!periodId) {
    console.error("Usage: tsx clear-matrix.ts <period-id>");
    process.exit(1);
  }

  console.log(`🧹 Clearing matrix untuk periode ${periodId}...`);
  const result = await clearMatrixForPeriod(periodId);

  if (result.success) {
    console.log(`✅ Sukses!`);
    console.log(`   Deleted ${result.evaluationsDeleted} evaluations`);
    console.log(`   Deleted ${result.objectiveScoresDeleted} objective_scores`);
  } else {
    console.error(`❌ Gagal: ${result.error}`);
  }
  process.exit(0);
}

main();
