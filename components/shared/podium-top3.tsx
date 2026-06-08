import { Trophy, Medal, Award, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RankingResultRow } from "@/lib/ranking-helpers";

interface Props {
  results: RankingResultRow[]; // sudah top 3, terurut peringkat
}

interface RankStyle {
  label: string;
  border: string;
  bg: string;
  text: string;
  icon: LucideIcon;
}

const RANK_STYLES: RankStyle[] = [
  {
    label: "Pegawai Terbaik",
    border: "border-amber-300 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-300",
    icon: Trophy,
  },
  {
    label: "Peringkat 2",
    border: "border-slate-300 dark:border-slate-700",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-600 dark:text-slate-300",
    icon: Medal,
  },
  {
    label: "Peringkat 3",
    border: "border-orange-300 dark:border-orange-900",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-700 dark:text-orange-300",
    icon: Award,
  },
];

export function PodiumTop3({ results }: Props) {
  const champion = results[0];
  const runnersUp = results.slice(1, 3);

  return (
    <div className="space-y-4">
      {/* Juara 1 */}
      {champion && (
        <Card
          className={`border-2 ${RANK_STYLES[0].border} ${RANK_STYLES[0].bg}`}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Trophy className={`h-12 w-12 ${RANK_STYLES[0].text}`} />
            <div
              className={`text-xs font-semibold uppercase tracking-wider ${RANK_STYLES[0].text}`}
            >
              {RANK_STYLES[0].label}
            </div>
            <div className="text-2xl font-bold">{champion.employeeName}</div>
            {champion.employeePosition && (
              <div className="text-sm text-muted-foreground">
                {champion.employeePosition}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Peringkat 2 & 3 */}
      {runnersUp.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {runnersUp.map((r, i) => {
            const style = RANK_STYLES[i + 1];
            const Icon = style.icon;
            return (
              <Card
                key={r.employeeId}
                className={`border ${style.border} ${style.bg}`}
              >
                <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                  <Icon className={`h-8 w-8 ${style.text}`} />
                  <div
                    className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}
                  >
                    {style.label}
                  </div>
                  <div className="text-lg font-bold">{r.employeeName}</div>
                  {r.employeePosition && (
                    <div className="text-xs text-muted-foreground">
                      {r.employeePosition}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
