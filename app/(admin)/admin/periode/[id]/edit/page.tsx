import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { evaluationPeriods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Lock, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PeriodForm } from "../../period-form";
import { STATUS_LABELS, type PeriodStatus } from "@/lib/period-constants";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPeriodPage({ params }: EditPageProps) {
  const { id } = await params;

  const period = await db.query.evaluationPeriods.findFirst({
    where: eq(evaluationPeriods.id, id),
  });

  if (!period) {
    notFound();
  }

  // Hanya DRAFT yang bisa diedit
  if (period.status !== "DRAFT") {
    const status = period.status as PeriodStatus;
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/periode/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Periode</h1>
          </div>
        </div>

        <Card>
          <CardContent className="py-10 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Periode Tidak Dapat Diedit
            </h3>
            <p className="text-muted-foreground mb-6">
              Periode <strong>{period.name}</strong> berstatus{" "}
              <strong>{STATUS_LABELS[status]}</strong>. Hanya periode berstatus
              DRAFT yang dapat diedit.
            </p>
            <Button asChild variant="outline">
              <Link href={`/admin/periode/${id}`}>Kembali ke Detail</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PeriodForm
      mode="edit"
      initial={{
        id: period.id,
        name: period.name,
        periodType: period.periodType,
        year: period.year,
        periodIndex: period.periodIndex,
        description: period.description ?? "",
        startDate: period.startDate,
        endDate: period.endDate,
      }}
    />
  );
}
