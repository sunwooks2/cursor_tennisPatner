import { isRestSlotForPlayer, matchIncludesPlayer } from "@/lib/match-highlight";
import { RestTimeView } from "@/components/rest-time-view";
import { getScoreForSlot, ScorableMatchCell } from "@/components/scorable-match-cell";
import type { ScoreEditorTarget } from "@/components/match-score-sheet";
import type { MatchScores } from "@/lib/match-scores";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

interface MobileScheduleByTimeProps {
  slots: Array<[string, ScheduleMatch[]]>;
  visibleCourts: number[];
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer: string | null;
  highlightActive: boolean;
  matchScores: MatchScores;
  onEditScore: (target: ScoreEditorTarget) => void;
}

export function MobileScheduleByTime({
  slots,
  visibleCourts,
  teamInfo,
  highlightedPlayer,
  highlightActive,
  matchScores,
  onEditScore,
}: MobileScheduleByTimeProps) {
  const showCourtLabel = visibleCourts.length > 1;

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
          className={`flex overflow-hidden rounded-lg border bg-white ${
            isRest ? "border-dashed border-[var(--line)] bg-[#f8fafc]" : "border-[var(--line)]"
          }`}
        >
          <div
            className={`schedule-time-col ${
              isRest
                ? "bg-[#f3f6fa] text-[var(--muted)]"
                : "bg-[#f8fafc] text-[var(--text)]"
            }`}
          >
            <span>{time}</span>
          </div>
          {isRest ? (
            <div className="schedule-mobile-row min-w-0 flex-1">
              <RestTimeView />
            </div>
          ) : (
            <div className="min-w-0 flex-1 divide-y divide-[var(--line)]">
              {rows.map(({ court, match }) => (
                <div key={`${time}-${court}`} className="schedule-mobile-row">
                  {showCourtLabel && (
                    <span className="w-10 shrink-0 text-xs font-semibold text-[var(--muted)]">
                      코트{court}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <ScorableMatchCell
                      time={time}
                      court={court}
                      match={match}
                      teamInfo={teamInfo}
                      highlightedPlayer={highlightActive ? highlightedPlayer : null}
                      score={getScoreForSlot(matchScores, time, court)}
                      onEditScore={onEditScore}
                    />
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
