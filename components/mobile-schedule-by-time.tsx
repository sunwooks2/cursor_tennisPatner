import { getMatchHighlightClass, matchIncludesPlayer } from "@/lib/match-highlight";
import { ScheduleMatchView } from "@/components/schedule-match-view";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

interface MobileScheduleByTimeProps {
  slots: Array<[string, ScheduleMatch[]]>;
  visibleCourts: number[];
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer: string | null;
  highlightActive: boolean;
}

export function MobileScheduleByTime({
  slots,
  visibleCourts,
  teamInfo,
  highlightedPlayer,
  highlightActive,
}: MobileScheduleByTimeProps) {
  const timeCards = slots
    .map(([time, list]) => {
      const rows = visibleCourts
        .map((court) => ({
          court,
          match: list.find((item) => item.court === court),
        }))
        .filter(({ match }) => {
          if (!highlightedPlayer) return true;
          return matchIncludesPlayer(match, highlightedPlayer);
        });

      return { time, rows };
    })
    .filter(({ rows }) => rows.length > 0);

  if (timeCards.length === 0 && highlightedPlayer) {
    return <p className="m-0 text-sm text-[var(--muted)]">{highlightedPlayer} 선수의 경기가 없습니다.</p>;
  }

  return (
    <div className="grid gap-2">
      {timeCards.map(({ time, rows }) => (
        <article
          key={time}
          className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
        >
          <header className="border-b border-[var(--line)] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[var(--text)]">
            {time}
          </header>
          <div className="divide-y divide-[var(--line)]">
            {rows.map(({ court, match }) => (
              <div
                key={`${time}-${court}`}
                className={`flex gap-2.5 px-3 py-2.5 transition-opacity ${getMatchHighlightClass(match, highlightedPlayer, highlightActive)}`}
              >
                <span className="w-10 shrink-0 pt-0.5 text-xs font-semibold text-[var(--muted)]">
                  코트{court}
                </span>
                <div className="min-w-0 flex-1">
                  <ScheduleMatchView match={match} teamInfo={teamInfo} />
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
