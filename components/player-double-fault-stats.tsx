import { PlayerNameWithGender } from "@/components/player-name-with-gender";
import type { TeamDoubleFaultGroup } from "@/lib/double-fault-totals";
import { isMalePlayer } from "@/lib/player-stats-display";

function rankLabel(rank: number): string {
  if (rank === 1) return "1위";
  if (rank === 2) return "2위";
  if (rank === 3) return "3위";
  return `${rank}위`;
}

interface PlayerDoubleFaultStatsProps {
  groups: TeamDoubleFaultGroup[];
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
  items: TeamDoubleFaultGroup["males"];
  males: string[];
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}) {
  if (!items.length) return null;

  const maxTotal = Math.max(...items.map((item) => item.total), 1);

  return (
    <div className="double-fault-stats__section">
      <ol className="player-score-ranking m-0 list-none p-0">
        {items.map((item, index) => {
          const width = item.total > 0 ? Math.max((item.total / maxTotal) * 100, 10) : 0;
          const rank = index + 1;
          const topThree = rank <= 3;

          return (
            <li key={item.player} className="player-score-ranking__item">
              <span
                className={`player-score-ranking__rank ${topThree ? "player-score-ranking__rank--top" : ""}`.trim()}
              >
                {rankLabel(rank)}
              </span>
              <span className="player-score-ranking__name double-fault-stats__name">
                {onHighlightPlayer ? (
                  <PlayerNameWithGender
                    name={item.displayName}
                    isMale={isMalePlayer(item.player, males)}
                    active={highlightedPlayer === item.player}
                    onClick={() =>
                      onHighlightPlayer(highlightedPlayer === item.player ? null : item.player)
                    }
                    title={`${item.displayName} · 내 경기 보기`}
                    nameClassName="text-xs font-semibold"
                  />
                ) : (
                  <PlayerNameWithGender
                    name={item.displayName}
                    isMale={isMalePlayer(item.player, males)}
                    nameClassName="text-xs font-semibold"
                  />
                )}
              </span>
              <span className="player-score-ranking__record double-fault-stats__record-spacer" aria-hidden>
                1승 0패
              </span>
              <div className="player-score-ranking__bar-track">
                {item.total > 0 ? (
                  <div
                    className="player-score-ranking__bar-fill double-fault-stats__bar-fill"
                    style={{ width: `${width}%`, minWidth: width > 0 ? "1.75rem" : undefined }}
                  />
                ) : null}
              </div>
              <span className="player-score-ranking__points double-fault-stats__count">
                {item.total}회
              </span>
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
  group: TeamDoubleFaultGroup;
  males: string[];
  teamMode: boolean;
  highlightedPlayer?: string | null;
  onHighlightPlayer?: (player: string | null) => void;
}) {
  return (
    <div className="double-fault-stats__team">
      {teamMode && group.teamName && (
        <p className="double-fault-stats__team-title">{group.teamName}</p>
      )}
      <div className="double-fault-stats__team-stack">
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

export function PlayerDoubleFaultStats({
  groups,
  males,
  teamMode = false,
  highlightedPlayer = null,
  onHighlightPlayer,
}: PlayerDoubleFaultStatsProps) {
  if (!groups.length) return null;

  return (
    <div className="double-fault-stats">
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
