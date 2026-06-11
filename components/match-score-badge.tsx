import { formatMatchScore, getMatchWinner, type MatchScore } from "@/lib/match-scores";

interface MatchScoreBadgeProps {
  score: MatchScore;
}

export function MatchScoreBadge({ score }: MatchScoreBadgeProps) {
  const winner = getMatchWinner(score);

  return (
    <p
      className="match-score-badge"
      aria-label={`점수 ${formatMatchScore(score)}`}
    >
      <span className={winner === "A" ? "match-score-badge__winner" : "match-score-badge__loser"}>
        {score.a}
      </span>
      <span className="match-score-badge__sep" aria-hidden>
        :
      </span>
      <span className={winner === "B" ? "match-score-badge__winner" : "match-score-badge__loser"}>
        {score.b}
      </span>
    </p>
  );
}
