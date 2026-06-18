import { PlayerNameWithGender } from "@/components/player-name-with-gender";
import { formatRelevantTypeCounts, isMalePlayer } from "@/lib/player-stats-display";
import type { PlayerStat } from "@/lib/types";

interface PlayerMatchCountSummaryProps {
  stats: PlayerStat[];
  males: string[];
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}

export function PlayerMatchCountSummary({
  stats,
  males,
  highlightedPlayer = null,
  onHighlightPlayer,
}: PlayerMatchCountSummaryProps) {
  if (!stats.length) {
    return <p className="text-sm text-[var(--muted)]">참가자가 없습니다.</p>;
  }

  const maxTotal = Math.max(...stats.map((s) => s.totalMatches), 1);

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-4">
      {stats.map((stat) => {
        const male = isMalePlayer(stat.player, males);
        const breakdown = formatRelevantTypeCounts(stat.typeCounts, male, true);
        const width =
          stat.totalMatches > 0 ? Math.max((stat.totalMatches / maxTotal) * 100, 8) : 0;

        return (
          <div key={stat.player} className="min-w-0">
            <div className="mb-1 flex min-w-0 flex-wrap items-baseline gap-x-1 leading-snug">
              <PlayerNameWithGender
                name={stat.player}
                isMale={male}
                active={highlightedPlayer === stat.player}
                onClick={
                  onHighlightPlayer
                    ? () =>
                        onHighlightPlayer(highlightedPlayer === stat.player ? null : stat.player)
                    : undefined
                }
                title={`${stat.player} · 내 경기 보기`}
              />
              {breakdown && (
                <span className="text-[0.68rem] font-normal text-[var(--muted)]">{breakdown}</span>
              )}
            </div>
            <div className="relative h-6 overflow-hidden rounded bg-[#eef2f8]">
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
  );
}
