import { formatPlayerShortName } from "@/lib/team-stats";
import type { ScheduleMode, TeamScheduleInfo } from "@/lib/types";

interface PlayerHighlightChipsProps {
  players: string[];
  selectedPlayer: string | null;
  onSelect: (player: string | null) => void;
  mode?: ScheduleMode;
  teamInfo?: TeamScheduleInfo;
  males?: string[];
}

type PlayerChip = {
  key: string;
  label: string;
};

type PlayerGroup = {
  label: string;
  players: PlayerChip[];
};

function chipClass(active: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.86rem] ${
    active
      ? "border-[var(--primary-border)] bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]"
      : "border-[var(--line)] bg-white text-[var(--text)]"
  }`;
}

function buildGroups(
  players: string[],
  mode: ScheduleMode,
  teamInfo?: TeamScheduleInfo,
  males: string[] = []
): PlayerGroup[] {
  if (mode === "team" && teamInfo) {
    const toChips = (list: string[], teamName: string): PlayerChip[] =>
      list.map((player) => ({
        key: player,
        label: formatPlayerShortName(player, teamName),
      }));

    return [
      {
        label: teamInfo.teamAName,
        players: toChips(
          [...teamInfo.teamAMales, ...teamInfo.teamAFemales],
          teamInfo.teamAName
        ),
      },
      {
        label: teamInfo.teamBName,
        players: toChips(
          [...teamInfo.teamBMales, ...teamInfo.teamBFemales],
          teamInfo.teamBName
        ),
      },
    ].filter((group) => group.players.length > 0);
  }

  const maleSet = new Set(males);
  const malePlayers = players.filter((player) => maleSet.has(player));
  const femalePlayers = players.filter((player) => !maleSet.has(player));

  return [
    {
      label: "남",
      players: malePlayers.map((player) => ({ key: player, label: player })),
    },
    {
      label: "여",
      players: femalePlayers.map((player) => ({ key: player, label: player })),
    },
  ].filter((group) => group.players.length > 0);
}

export function PlayerHighlightChips({
  players,
  selectedPlayer,
  onSelect,
  mode = "free",
  teamInfo,
  males = [],
}: PlayerHighlightChipsProps) {
  if (!players.length) return null;

  const groups = buildGroups(players, mode, teamInfo, males);

  return (
    <div className="export-exclude player-highlight-chips mb-3">
      <div className="player-highlight-chips__header">
        <p className="m-0 text-xs font-semibold text-[var(--muted)]">내 경기 보기</p>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.86rem] ${
            selectedPlayer === null
              ? "border-[var(--primary-border)] bg-[var(--primary-soft)] font-semibold text-[var(--primary-text)]"
              : "border-[var(--line)] bg-white text-[var(--text)]"
          }`}
        >
          전체
        </button>
      </div>

      <div className="player-highlight-chips__groups">
        {groups.map((group) => (
          <div key={group.label} className="player-highlight-chips__row">
            <span className="player-highlight-chips__group-label">{group.label}</span>
            <div className="player-highlight-chips__scroll">
              {group.players.map((player) => (
                <button
                  key={player.key}
                  type="button"
                  onClick={() => onSelect(selectedPlayer === player.key ? null : player.key)}
                  className={chipClass(selectedPlayer === player.key)}
                  title={player.key}
                >
                  {player.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
