import { formatPlayerRecord, type PlayerScoreTotal } from "@/lib/player-score-totals";

interface PlayerScoreRankingProps {
  rankings: PlayerScoreTotal[];
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}

function rankLabel(rank: number): string {
  if (rank === 1) return "1위";
  if (rank === 2) return "2위";
  if (rank === 3) return "3위";
  return `${rank}위`;
}

export function PlayerScoreRanking({
  rankings,
  highlightedPlayer = null,
  onHighlightPlayer,
}: PlayerScoreRankingProps) {
  if (rankings.length === 0) return null;

  const maxPoints = Math.max(...rankings.map((item) => item.totalPoints), 1);

  return (
    <ol className="player-score-ranking m-0 list-none p-0">
      {rankings.map((item, index) => {
        const rank = index + 1;
        const width = Math.max((item.totalPoints / maxPoints) * 100, 10);
        const topThree = rank <= 3;

        return (
          <li key={item.player} className="player-score-ranking__item">
            <span
              className={`player-score-ranking__rank ${topThree ? "player-score-ranking__rank--top" : ""}`.trim()}
            >
              {rankLabel(rank)}
            </span>
            {onHighlightPlayer ? (
              <button
                type="button"
                onClick={() =>
                  onHighlightPlayer(highlightedPlayer === item.player ? null : item.player)
                }
                className={`player-score-ranking__name ${
                  highlightedPlayer === item.player ? "player-score-ranking__name--active" : ""
                }`.trim()}
                title={`${item.player} · 내 경기 보기`}
              >
                {item.player}
              </button>
            ) : (
              <span className="player-score-ranking__name">{item.player}</span>
            )}
            <span className="player-score-ranking__record">{formatPlayerRecord(item)}</span>
            <div className="player-score-ranking__bar-track">
              <div
                className="player-score-ranking__bar-fill"
                style={{ width: `${width}%`, minWidth: width > 0 ? "1.75rem" : undefined }}
              >
                <span className="player-score-ranking__bar-label">{item.scoredMatches}경기</span>
              </div>
            </div>
            <span className="player-score-ranking__points">{item.totalPoints}점</span>
          </li>
        );
      })}
    </ol>
  );
}
