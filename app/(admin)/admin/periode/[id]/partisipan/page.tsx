import { notFound } from "next/navigation";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getParticipants,
  getAvailableEmployees,
} from "@/lib/participant-helpers";
import { ParticipantsManager } from "./participants-manager";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ParticipantsPage({ params }: PageProps) {
  const { id } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, id),
    columns: { id: true, name: true, status: true },
  });

  if (!period) notFound();

  const [participants, availableEmployees] = await Promise.all([
    getParticipants(id),
    getAvailableEmployees(id),
  ]);

  return (
    <ParticipantsManager
      periodId={id}
      periodName={period.name}
      periodStatus={period.status}
      participants={participants}
      availableEmployees={availableEmployees}
    />
  );
}
