import { PlayerNameWithGender } from "@/components/player-name-with-gender";
import {
  formatPlayerRecord,
  type PlayerScoreRankingEntry,
  type TeamScoreRankingGroup,
} from "@/lib/player-score-totals";
import { isMalePlayer } from "@/lib/player-stats-display";

function rankLabel(rank: number): string {
  if (rank === 1) return "1위";
  if (rank === 2) return "2위";
  if (rank === 3) return "3위";
  return `${rank}위`;
}

interface PlayerScoreRankingProps {
  groups: TeamScoreRankingGroup[];
  males: string[];
  teamMode?: boolean;
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}

function GenderSection({
  items,
  males,
  highlightedPlayer,
  onHighlightPlayer,
}: {
  items: PlayerScoreRankingEntry[];
  males: string[];
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}) {
  if (!items.length) return null;

  const maxPoints = Math.max(...items.map((item) => item.totalPoints), 1);

  return (
    <div className="stats-grouped__section">
      <ol className="player-score-ranking m-0 list-none p-0">
        {items.map((item, index) => {
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
              <span className="player-score-ranking__name">
                <PlayerNameWithGender
                  name={item.displayName}
                  isMale={isMalePlayer(item.player, males)}
                  active={highlightedPlayer === item.player}
                  onClick={
                    onHighlightPlayer
                      ? () =>
                          onHighlightPlayer(highlightedPlayer === item.player ? null : item.player)
                      : undefined
                  }
                  title={`${item.displayName} · 내 경기 보기`}
                />
              </span>
              <span className="player-score-ranking__record">{formatPlayerRecord(item)}</span>
              <div className="player-score-ranking__bar-track">
                {item.scoredMatches > 0 ? (
                  <div
                    className="player-score-ranking__bar-fill"
                    style={{ width: `${width}%`, minWidth: width > 0 ? "1.75rem" : undefined }}
                  >
                    <span className="player-score-ranking__bar-label">{item.scoredMatches}경기</span>
                  </div>
                ) : null}
              </div>
              <span className="player-score-ranking__points">{item.totalPoints}점</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TeamGroup({
  group,
  males,
  teamMode,
  highlightedPlayer,
  onHighlightPlayer,
}: {
  group: TeamScoreRankingGroup;
  males: string[];
  teamMode: boolean;
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}) {
  return (
    <div className="stats-grouped__team">
      {teamMode && group.teamName && (
        <p className="stats-grouped__team-title">{group.teamName}</p>
      )}
      <div className="stats-grouped__team-stack">
        <GenderSection
          items={group.males}
          males={males}
          highlightedPlayer={highlightedPlayer}
          onHighlightPlayer={onHighlightPlayer}
        />
        <GenderSection
          items={group.females}
          males={males}
          highlightedPlayer={highlightedPlayer}
          onHighlightPlayer={onHighlightPlayer}
        />
      </div>
    </div>
  );
}

export function PlayerScoreRanking({
  groups,
  males,
  teamMode = false,
  highlightedPlayer = null,
  onHighlightPlayer,
}: PlayerScoreRankingProps) {
  if (!groups.length) return null;

  return (
    <div className="stats-grouped">
      {groups.map((group) => (
        <TeamGroup
          key={group.teamName || "free"}
          group={group}
          males={males}
          teamMode={teamMode}
          highlightedPlayer={highlightedPlayer}
          onHighlightPlayer={onHighlightPlayer}
        />
      ))}
    </div>
  );
}
