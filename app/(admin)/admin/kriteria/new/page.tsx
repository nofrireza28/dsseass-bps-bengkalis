import { db } from "@/db";
import { criteria } from "@/db/schema";
import { desc } from "drizzle-orm";

import { CriteriaCreateForm } from "./criteria-create-form";
import {
  getBlockingPeriod,
  formatBlockedMessage,
} from "@/lib/criteria-helpers";

export default async function NewCriteriaPage() {
  // Generate suggested code (K01, K02, ...)
  const lastCriteria = await db
    .select({ code: criteria.code })
    .from(criteria)
    .orderBy(desc(criteria.displayOrder))
    .limit(1);

  let suggestedCode = "K01";
  if (lastCriteria.length > 0) {
    const lastCode = lastCriteria[0].code;
    const match = lastCode.match(/^K(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1]) + 1;
      suggestedCode = `K${String(nextNum).padStart(2, "0")}`;
    }
  }

  // Cek periode aktif (lock state)
  const blocking = await getBlockingPeriod();

  return (
    <CriteriaCreateForm
      suggestedCode={suggestedCode}
      isLocked={!!blocking}
      lockReason={blocking ? formatBlockedMessage(blocking) : null}
    />
  );
}
