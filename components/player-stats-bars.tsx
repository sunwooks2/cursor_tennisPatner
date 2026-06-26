import { GenderIcon } from "@/components/gender-icon";
import { PlayerNameWithGender } from "@/components/player-name-with-gender";
import { buildRelationCounts, getOpposingTeamPlayers, getSameTeamPlayers } from "@/lib/team-stats";
import { formatRelevantTypeCounts, isMalePlayer } from "@/lib/player-stats-display";
import type { MatchType, PlayerStat, ScheduleMode, TeamScheduleInfo } from "@/lib/types";

interface PlayerStatsBarsProps {
  stats: PlayerStat[];
  males: string[];
  mode?: ScheduleMode;
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}

function TypeCountLabel({
  typeCounts,
  isMale,
}: {
  typeCounts: Record<MatchType, number>;
  isMale: boolean;
}) {
  const text = formatRelevantTypeCounts(typeCounts, isMale);
  if (!text) return null;

  return <span className="ml-1 text-[0.68rem] font-normal text-[var(--muted)]">{text}</span>;
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
  males,
}: {
  title: string;
  entries: [string, number][];
  maxCount: number;
  males: string[];
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
              <span
                className="flex w-20 min-w-0 shrink-0 items-center gap-1 truncate text-xs font-medium"
                title={name}
              >
                <GenderIcon gender={isMalePlayer(name, males) ? "male" : "female"} className="h-3.5 w-[0.55rem]" />
                <span className="truncate">{name}</span>
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

export function PlayerStatsBars({
  stats,
  males,
  mode = "free",
  teamInfo,
  highlightedPlayer = null,
  onHighlightPlayer,
}: PlayerStatsBarsProps) {
  if (!stats.length) {
    return <p className="text-sm text-[var(--muted)]">참가자가 없습니다.</p>;
  }

  const isTeamMode = Boolean(teamInfo);
  const allPlayers = stats.map((s) => s.player);
  const team = teamInfo!;

  const partnerEntriesList = stats.map((stat) =>
    isTeamMode
      ? buildRelationCounts(stat.player, getSameTeamPlayers(stat.player, team), stat.partners)
      : buildFullCounts(stat.player, allPlayers, stat.partners)
  );
  const opponentEntriesList = stats.map((stat) =>
    isTeamMode
      ? buildRelationCounts(stat.player, getOpposingTeamPlayers(stat.player, team), stat.opponents)
      : buildFullCounts(stat.player, allPlayers, stat.opponents)
  );
  const maxPartner = maxEntryCount(partnerEntriesList);
  const maxOpponent = maxEntryCount(opponentEntriesList);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stats.map((stat, index) => (
        <article
          key={stat.player}
          className="rounded-lg border border-[var(--line)] bg-white p-3"
        >
          <h3 className="mb-3 flex flex-wrap items-baseline gap-x-1 text-sm font-bold">
            <PlayerNameWithGender
              name={stat.player}
              isMale={isMalePlayer(stat.player, males)}
              active={highlightedPlayer === stat.player}
              onClick={
                onHighlightPlayer
                  ? () =>
                      onHighlightPlayer(highlightedPlayer === stat.player ? null : stat.player)
                  : undefined
              }
              title="내 경기 하이라이트"
            />
            <TypeCountLabel
              typeCounts={stat.typeCounts}
              isMale={isMalePlayer(stat.player, males)}
            />
          </h3>
          <div className="space-y-4">
            <CountBars
              title={isTeamMode ? "페어" : "페어 상대"}
              entries={partnerEntriesList[index]}
              maxCount={maxPartner}
              males={males}
            />
            <CountBars
              title={isTeamMode ? "상대" : "상대 팀원"}
              entries={opponentEntriesList[index]}
              maxCount={maxOpponent}
              males={males}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
