import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth"; // sesuaikan path
import { db } from "@/db";
import { employees } from "@/db/schema";
import {
  getEvaluationWithScores,
  getSubCriteriaForEvaluation,
  getTotalMultiRaterSubCriteria,
} from "@/lib/evaluation-helpers";
import { EvaluationForm } from "./evaluation-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EvaluationFormPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Auth
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 2. Get employee
  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, session.user.id),
  });
  if (!employee) notFound();

  // 3. Get evaluation (dengan security check di helper)
  const evaluation = await getEvaluationWithScores(id, employee.id);
  if (!evaluation) notFound();

  // 4. Get struktur sub-kriteria + total
  const [subCriteriaGroups, totalSubCriteria] = await Promise.all([
    getSubCriteriaForEvaluation(),
    getTotalMultiRaterSubCriteria(),
  ]);

  // 5. Tentukan read-only (SUBMITTED atau periode bukan OPEN)
  const isReadOnly =
    evaluation.status === "SUBMITTED" || evaluation.periodStatus !== "OPEN";

  return (
    <EvaluationForm
      id={evaluation.id}
      evaluateeName={evaluation.evaluateeName}
      evaluateePosition={evaluation.evaluateePosition}
      periodName={evaluation.periodName}
      status={evaluation.status as "DRAFT" | "SUBMITTED"}
      submittedAt={evaluation.submittedAt}
      isReadOnly={isReadOnly}
      subCriteriaGroups={subCriteriaGroups}
      initialScores={evaluation.scoresBySubCriteria}
      totalSubCriteria={totalSubCriteria}
    />
  );
}
