import {
  getBlockingPeriod,
  getCurrentTotalLeafWeight,
  formatBlockedMessage,
} from "@/lib/criteria-helpers";

import { NewCriteriaPicker } from "./new-criteria-picker";

export default async function NewCriteriaPage() {
  const blocking = await getBlockingPeriod();
  const otherLeafWeight = await getCurrentTotalLeafWeight();

  return (
    <NewCriteriaPicker
      otherLeafWeight={otherLeafWeight}
      isLocked={!!blocking}
      lockReason={blocking ? formatBlockedMessage(blocking) : null}
    />
  );
}
