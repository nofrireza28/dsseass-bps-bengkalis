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

function TieBadge() {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      Seri
    </span>
  );
}

export function PodiumTop3({ results }: Props) {
  if (results.length === 0) return null;

  // Status seri diturunkan dari rankPosition yang dihuni lebih dari satu pegawai.
  const rankCount = results.reduce<Record<number, number>>((acc, r) => {
    acc[r.rankPosition] = (acc[r.rankPosition] ?? 0) + 1;
    return acc;
  }, {});
  const isTied = (rank: number) => (rankCount[rank] ?? 0) > 1;

  const minRank = Math.min(...results.map((r) => r.rankPosition));
  const champions = results.filter((r) => r.rankPosition === minRank);
  const runnersUp = results.filter((r) => r.rankPosition !== minRank);

  // Kasus juara seri: tampilkan semua juara, serahkan keputusan ke panitia.
  if (champions.length > 1) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          Terdapat <strong>{champions.length} pegawai</strong> dengan nilai
          tertinggi yang identik (seri). Penetapan Pegawai Terbaik diputuskan
          oleh panitia.
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {champions.map((r) => (
            <Card
              key={r.employeeId}
              className={`border-2 ${RANK_STYLES[0].border} ${RANK_STYLES[0].bg}`}
            >
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                <Trophy className={`h-9 w-9 ${RANK_STYLES[0].text}`} />
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${RANK_STYLES[0].text}`}
                >
                  {RANK_STYLES[0].label} <TieBadge />
                </div>
                <div className="text-lg font-bold">{r.employeeName}</div>
                {r.employeePosition && (
                  <div className="text-xs text-muted-foreground">
                    {r.employeePosition}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Kasus normal: satu juara + runner-up.
  const champion = champions[0];
  const topRunners = runnersUp.slice(0, 2);

  return (
    <div className="space-y-4">
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

      {topRunners.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {topRunners.map((r) => {
            const style =
              RANK_STYLES[Math.min(r.rankPosition - 1, RANK_STYLES.length - 1)];
            const Icon = style.icon;
            return (
              <Card
                key={r.employeeId}
                className={`border ${style.border} ${style.bg}`}
              >
                <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                  <Icon className={`h-8 w-8 ${style.text}`} />
                  <div
                    className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${style.text}`}
                  >
                    {style.label} {isTied(r.rankPosition) && <TieBadge />}
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
