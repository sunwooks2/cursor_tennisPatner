import {
  getMatchHighlightClass,
  isRestSlotForPlayer,
  matchIncludesPlayer,
} from "@/lib/match-highlight";
import { RestTimeView } from "@/components/rest-time-view";
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
      if (highlightedPlayer && isRestSlotForPlayer(list, highlightedPlayer, visibleCourts)) {
        return { time, isRest: true as const, rows: [] };
      }

      const rows = visibleCourts
        .map((court) => ({
          court,
          match: list.find((item) => item.court === court),
        }))
        .filter(({ match }) => {
          if (!highlightedPlayer) return true;
          return matchIncludesPlayer(match, highlightedPlayer);
        });

      return { time, isRest: false as const, rows };
    })
    .filter(({ isRest, rows }) => !highlightedPlayer || isRest || rows.length > 0);

  if (timeCards.length === 0 && highlightedPlayer) {
    return <p className="m-0 text-sm text-[var(--muted)]">{highlightedPlayer} 선수의 경기가 없습니다.</p>;
  }

  return (
    <div className="grid gap-2">
      {timeCards.map(({ time, isRest, rows }) => (
        <article
          key={time}
          className={`overflow-hidden rounded-lg border bg-white ${
            isRest ? "border-dashed border-[var(--line)] bg-[#f8fafc]" : "border-[var(--line)]"
          }`}
        >
          <header
            className={`border-b px-3 py-2 text-sm font-semibold ${
              isRest
                ? "border-[var(--line)] bg-[#f3f6fa] text-[var(--muted)]"
                : "border-[var(--line)] bg-[#f8fafc] text-[var(--text)]"
            }`}
          >
            {time}
            {isRest && <span className="ml-1.5 text-xs font-medium">· 휴식</span>}
          </header>
          {isRest ? (
            <div className="px-3 py-3">
              <RestTimeView />
            </div>
          ) : (
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
          )}
        </article>
      ))}
    </div>
  );
}
