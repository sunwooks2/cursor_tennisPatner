import { PlayerNameWithGender } from "@/components/player-name-with-gender";
import { formatPlayerRecord, type PlayerScoreTotal } from "@/lib/player-score-totals";
import { isMalePlayer } from "@/lib/player-stats-display";
import { formatPlayerShortName, getTeamNameForPlayer } from "@/lib/team-stats";
import type { TeamScheduleInfo } from "@/lib/types";

interface PlayerScoreRankingProps {
  rankings: PlayerScoreTotal[];
  males: string[];
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}

function rankLabel(rank: number): string {
  if (rank === 1) return "1위";
  if (rank === 2) return "2위";
  if (rank === 3) return "3위";
  return `${rank}위`;
}

function getPlayerDisplayName(player: string, teamInfo?: TeamScheduleInfo): string {
  if (!teamInfo) return player;
  const teamName = getTeamNameForPlayer(player, teamInfo);
  const shortName = formatPlayerShortName(player, teamName);
  return `${teamName} ${shortName}`;
}

export function PlayerScoreRanking({
  rankings,
  males,
  teamInfo,
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
        const displayName = getPlayerDisplayName(item.player, teamInfo);

        return (
          <li key={item.player} className="player-score-ranking__item">
            <span
              className={`player-score-ranking__rank ${topThree ? "player-score-ranking__rank--top" : ""}`.trim()}
            >
              {rankLabel(rank)}
            </span>
            <span className="player-score-ranking__name double-fault-stats__name">
              <PlayerNameWithGender
                name={displayName}
                isMale={isMalePlayer(item.player, males)}
                active={highlightedPlayer === item.player}
                onClick={
                  onHighlightPlayer
                    ? () =>
                        onHighlightPlayer(highlightedPlayer === item.player ? null : item.player)
                    : undefined
                }
                title={`${displayName} · 내 경기 보기`}
              />
            </span>
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
