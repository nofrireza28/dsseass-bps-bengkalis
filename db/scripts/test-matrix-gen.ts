import {
  generateMatrixForPeriod,
  clearMatrixForPeriod,
} from "@/lib/matrix-generator";
import { db } from "@/db";
import { evaluationPeriods, evaluations, objectiveScores } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const reset = process.argv.includes("--reset");

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.status, "DRAFT"),
  });

  if (!period) {
    console.log("❌ Tidak ada periode DRAFT untuk test.");
    process.exit(1);
  }

  console.log(`\n=== Test Matrix Generation ===`);
  console.log(`Periode: ${period.name}`);
  console.log(`ID: ${period.id}\n`);

  // Optional: reset dulu untuk test ulang
  if (reset) {
    console.log("🧹 Reset matrix existing...");
    const cleared = await clearMatrixForPeriod(period.id);
    console.log(
      `   Deleted: ${cleared.evaluationsDeleted} evaluations, ${cleared.objectiveScoresDeleted} objective_scores\n`,
    );
  }

  // Generate
  console.log("⚙️  Generating matrix...");
  const result = await generateMatrixForPeriod(period.id);

  if (!result.success) {
    console.log(`\n❌ Gagal: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Sukses!`);
  console.log(`   Evaluations: ${result.evaluationCount} records`);
  console.log(`   Objective scores: ${result.objectiveCount} records`);
  console.log(
    `   Total: ${(result.evaluationCount ?? 0) + (result.objectiveCount ?? 0)} records\n`,
  );

  // Verify dari DB
  console.log("🔍 Verifikasi dari DB:");
  const [evalsInDb, objsInDb] = await Promise.all([
    db.select().from(evaluations).where(eq(evaluations.periodId, period.id)),
    db
      .select()
      .from(objectiveScores)
      .where(eq(objectiveScores.periodId, period.id)),
  ]);

  console.log(`   evaluations: ${evalsInDb.length} rows`);
  console.log(`   objective_scores: ${objsInDb.length} rows`);

  // Sample preview
  if (evalsInDb.length > 0) {
    const sample = evalsInDb[0];
    console.log(
      `\n   Sample evaluation: evaluator=${sample.evaluatorId.slice(0, 8)}... → evaluatee=${sample.evaluateeId.slice(0, 8)}... [${sample.status}]`,
    );
  }
  if (objsInDb.length > 0) {
    const sample = objsInDb[0];
    console.log(
      `   Sample objective:  employee=${sample.employeeId.slice(0, 8)}... × criteria=${sample.criteriaId.slice(0, 8)}... [finalScore=${sample.finalScore}]`,
    );
  }

  console.log();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
