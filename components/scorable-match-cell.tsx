import { MatchScoreBadge } from "@/components/match-score-badge";
import { ScheduleMatchView } from "@/components/schedule-match-view";
import { makeMatchKey, type MatchScore } from "@/lib/match-scores";
import type { ScoreEditorTarget } from "@/components/match-score-sheet";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

interface ScorableMatchCellProps {
  time: string;
  court: number;
  match?: ScheduleMatch;
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer?: string | null;
  score?: MatchScore;
  onEditScore: (target: ScoreEditorTarget) => void;
  className?: string;
}

export function ScorableMatchCell({
  time,
  court,
  match,
  teamInfo,
  highlightedPlayer,
  score,
  onEditScore,
  className = "",
}: ScorableMatchCellProps) {
  const canScore = Boolean(match && !match.empty);

  if (!canScore) {
    return (
      <div className={className}>
        <ScheduleMatchView match={match} teamInfo={teamInfo} highlightedPlayer={highlightedPlayer} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`scorable-match-cell ${className}`.trim()}
      onClick={() => onEditScore({ time, court, match: match! })}
      aria-label={`${time} 코트${court} 점수 입력`}
    >
      <div className="scorable-match-cell__match">
        <ScheduleMatchView match={match} teamInfo={teamInfo} highlightedPlayer={highlightedPlayer} />
      </div>
      <div className="scorable-match-cell__aside">
        {score ? <MatchScoreBadge score={score} /> : <span className="scorable-match-cell__hint">점수입력</span>}
      </div>
    </button>
  );
}

export function getScoreForSlot(
  scores: Record<string, MatchScore>,
  time: string,
  court: number
): MatchScore | undefined {
  return scores[makeMatchKey(time, court)];
}
