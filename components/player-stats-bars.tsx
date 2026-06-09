import { buildRelationCounts, getOpposingTeamPlayers, getSameTeamPlayers } from "@/lib/team-stats";
import type { MatchType, PlayerStat, ScheduleMode, TeamScheduleInfo } from "@/lib/types";

interface PlayerStatsBarsProps {
  stats: PlayerStat[];
  mode?: ScheduleMode;
  teamInfo?: TeamScheduleInfo;
}

function TypeCountLabel({ typeCounts }: { typeCounts: Record<MatchType, number> }) {
  return (
    <span className="ml-1 text-[0.68rem] font-normal text-[var(--muted)]">
      여복 {typeCounts.WD}회 · 남복 {typeCounts.MD}회 · 혼복 {typeCounts.MXD}회
    </span>
  );
}

function buildFullCounts(
  player: string,
  allPlayers: string[],
  counts: Record<string, number>
): [string, number][] {
  return allPlayers
    .filter((p) => p !== player)
    .map((name) => [name, counts[name] ?? 0] as [string, number]);
}

function CountBars({
  title,
  entries,
  maxCount,
}: {
  title: string;
  entries: [string, number][];
  maxCount: number;
}) {
  if (!entries.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">{title}</p>
      <div className="space-y-2">
        {entries.map(([name, count]) => {
          const width =
            count > 0 && maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
          return (
            <div key={name} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-xs font-medium" title={name}>
                {name}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-[#eef2f8]">
                {count > 0 ? (
                  <div
                    className="flex h-full items-center rounded bg-[var(--primary)] px-1.5 text-[0.7rem] font-semibold text-[var(--primary-foreground)]"
                    style={{ width: `${width}%`, minWidth: "2rem" }}
                  >
                    {count}회
                  </div>
                ) : (
                  <span className="absolute inset-y-0 left-1.5 flex items-center text-[0.7rem] text-[var(--muted)]">
                    0회
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function maxEntryCount(entriesList: [string, number][][]): number {
  const values = entriesList.flat().map(([, count]) => count);
  return Math.max(...values, 1);
}

export function PlayerStatsBars({ stats, mode = "free", teamInfo }: PlayerStatsBarsProps) {
  if (!stats.length) {
    return <p className="text-sm text-[var(--muted)]">참가자가 없습니다.</p>;
  }

  const isTeamMode = mode === "team" && teamInfo;
  const allPlayers = stats.map((s) => s.player);
  const maxTotal = Math.max(...stats.map((s) => s.totalMatches), 1);

  const partnerEntriesList = stats.map((stat) =>
    isTeamMode
      ? buildRelationCounts(stat.player, getSameTeamPlayers(stat.player, teamInfo), stat.partners)
      : buildFullCounts(stat.player, allPlayers, stat.partners)
  );
  const opponentEntriesList = stats.map((stat) =>
    isTeamMode
      ? buildRelationCounts(stat.player, getOpposingTeamPlayers(stat.player, teamInfo), stat.opponents)
      : buildFullCounts(stat.player, allPlayers, stat.opponents)
  );
  const maxPartner = maxEntryCount(partnerEntriesList);
  const maxOpponent = maxEntryCount(opponentEntriesList);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">총 경기수</p>
        <div className="space-y-2">
          {stats.map((stat) => {
            const width =
              stat.totalMatches > 0
                ? Math.max((stat.totalMatches / maxTotal) * 100, 8)
                : 0;
            return (
              <div key={`total-${stat.player}`} className="flex items-center gap-2">
                <div className="flex min-w-[7rem] shrink-0 flex-wrap items-baseline gap-x-1">
                  <span className="text-sm font-semibold">{stat.player}</span>
                  <TypeCountLabel typeCounts={stat.typeCounts} />
                </div>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-[#eef2f8]">
                  {stat.totalMatches > 0 ? (
                    <div
                      className="flex h-full items-center rounded bg-[var(--primary)] px-2 text-xs font-semibold text-[var(--primary-foreground)]"
                      style={{ width: `${width}%`, minWidth: "2.5rem" }}
                    >
                      {stat.totalMatches}경기
                    </div>
                  ) : (
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs text-[var(--muted)]">
                      0경기
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stats.map((stat, index) => (
          <article
            key={stat.player}
            className="rounded-lg border border-[var(--line)] bg-white p-3"
          >
            <h3 className="mb-3 flex flex-wrap items-baseline gap-x-1 text-sm font-bold">
              <span>{stat.player}</span>
              <TypeCountLabel typeCounts={stat.typeCounts} />
            </h3>
            <div className="space-y-4">
              <CountBars
                title={isTeamMode ? "페어" : "페어 상대"}
                entries={partnerEntriesList[index]}
                maxCount={maxPartner}
              />
              <CountBars
                title={isTeamMode ? "상대" : "상대 팀원"}
                entries={opponentEntriesList[index]}
                maxCount={maxOpponent}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
