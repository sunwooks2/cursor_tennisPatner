import { MatchScoreBadge } from "@/components/match-score-badge";
import { ScheduleMatchView } from "@/components/schedule-match-view";
import { makeMatchKey, type MatchScore } from "@/lib/match-scores";
import { isPendingMatch, isPlayableMatch } from "@/lib/match-utils";
import type { ScoreEditorTarget } from "@/components/match-score-sheet";
import type { ManualMatchTarget } from "@/components/manual-match-sheet";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

interface ScheduleSlotCellProps {
  time: string;
  court: number;
  match?: ScheduleMatch;
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer?: string | null;
  score?: MatchScore;
  manualMode?: boolean;
  onEditScore: (target: ScoreEditorTarget) => void;
  onEditManual?: (target: ManualMatchTarget) => void;
  className?: string;
}

export function ScheduleSlotCell({
  time,
  court,
  match,
  teamInfo,
  highlightedPlayer,
  score,
  manualMode = false,
  onEditScore,
  onEditManual,
  className = "",
}: ScheduleSlotCellProps) {
  if (!match || match.empty) {
    return (
      <div className={className}>
        <ScheduleMatchView match={match} teamInfo={teamInfo} highlightedPlayer={highlightedPlayer} />
      </div>
    );
  }

  if (manualMode && isPendingMatch(match)) {
    return (
      <button
        type="button"
        className={`scorable-match-cell scorable-match-cell--pending ${className}`.trim()}
        onClick={() => onEditManual?.({ time, court, match })}
        aria-label={`${time} 코트${court} 선수 배정`}
      >
        <div className="scorable-match-cell__match">
          <span className="text-sm font-semibold text-[var(--muted)]">선수 배정</span>
        </div>
        <div className="scorable-match-cell__aside">
          <span className="scorable-match-cell__hint">탭</span>
        </div>
      </button>
    );
  }

  if (!isPlayableMatch(match)) {
    return (
      <div className={className}>
        <ScheduleMatchView match={match} teamInfo={teamInfo} highlightedPlayer={highlightedPlayer} />
      </div>
    );
  }

  if (manualMode && isPlayableMatch(match)) {
    return (
      <div className={`scorable-match-cell scorable-match-cell--split ${className}`.trim()}>
        <button
          type="button"
          className="scorable-match-cell__match scorable-match-cell__match-btn"
          onClick={() => onEditManual?.({ time, court, match })}
          aria-label={`${time} 코트${court} 선수 수정`}
        >
          <ScheduleMatchView match={match} teamInfo={teamInfo} highlightedPlayer={highlightedPlayer} />
        </button>
        <button
          type="button"
          className="scorable-match-cell__aside"
          onClick={() => onEditScore({ time, court, match })}
          aria-label={`${time} 코트${court} 점수 입력`}
        >
          {score ? <MatchScoreBadge score={score} /> : <span className="scorable-match-cell__hint">점수입력</span>}
        </button>
      </div>
    );
  }

  const handleClick = () => {
    if (manualMode && onEditManual && !score) {
      onEditManual({ time, court, match });
      return;
    }
    onEditScore({ time, court, match });
  };

  return (
    <button
      type="button"
      className={`scorable-match-cell ${className}`.trim()}
      onClick={handleClick}
      aria-label={`${time} 코트${court} 점수 입력`}
    >
      <div className="scorable-match-cell__match">
        <ScheduleMatchView match={match} teamInfo={teamInfo} highlightedPlayer={highlightedPlayer} />
      </div>
      <div className="scorable-match-cell__aside">
        {score ? (
          <MatchScoreBadge score={score} />
        ) : (
          <span className="scorable-match-cell__hint">{manualMode ? "점수입력" : "점수입력"}</span>
        )}
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
