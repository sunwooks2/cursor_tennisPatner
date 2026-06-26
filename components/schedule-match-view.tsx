import { HighlightablePlayerName } from "@/components/highlightable-player-name";
import { parseTypeLabel } from "@/lib/schedule-common";
import { formatMatchText } from "@/lib/schedule";
import { getMatchTypeBadgeClass } from "@/lib/match-theme";
import { parseTeamMatchDisplay } from "@/lib/team-stats";
import type { MatchType, ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

interface ScheduleMatchViewProps {
  match?: ScheduleMatch;
  inline?: boolean;
  teamInfo?: TeamScheduleInfo;
  highlightedPlayer?: string | null;
}

function MatchTypeBadge({ type, label }: { type: MatchType; label: string }) {
  return (
    <span
      className={`schedule-match-line__badge shrink-0 rounded-full px-1.5 py-px text-[0.65rem] font-semibold ${getMatchTypeBadgeClass(type)}`}
    >
      {label}
    </span>
  );
}

function TeamSide({
  teamName,
  players,
  playerKeys,
  highlightedPlayer,
  className = "",
}: {
  teamName: string;
  players: [string, string];
  playerKeys: [string, string];
  highlightedPlayer?: string | null;
  className?: string;
}) {
  return (
    <span className={`schedule-match-line__side inline-flex min-w-0 items-center gap-1 ${className}`.trim()}>
      <span className="shrink-0 font-semibold text-[var(--text)]">{teamName}</span>
      <span className="min-w-0 text-[var(--muted)]">
        <HighlightablePlayerName
          name={players[0]}
          highlightKey={playerKeys[0]}
          highlightedPlayer={highlightedPlayer}
        />
        <span aria-hidden>·</span>
        <HighlightablePlayerName
          name={players[1]}
          highlightKey={playerKeys[1]}
          highlightedPlayer={highlightedPlayer}
        />
      </span>
    </span>
  );
}

function PlayerPair({
  players,
  highlightedPlayer,
  className = "",
}: {
  players: [string, string];
  highlightedPlayer?: string | null;
  className?: string;
}) {
  return (
    <span className={`schedule-match-line__side min-w-0 whitespace-nowrap text-[var(--text)] ${className}`.trim()}>
      <HighlightablePlayerName name={players[0]} highlightedPlayer={highlightedPlayer} />
      {" "}
      <HighlightablePlayerName name={players[1]} highlightedPlayer={highlightedPlayer} />
    </span>
  );
}

function TeamMatchLine({
  display,
  highlightedPlayer,
}: {
  display: NonNullable<ReturnType<typeof parseTeamMatchDisplay>>;
  highlightedPlayer?: string | null;
}) {
  return (
    <div className="schedule-match-line m-0 text-[0.8rem] leading-snug">
      <MatchTypeBadge type={display.type} label={display.typeLabel} />
      <div className="schedule-match-line__body">
        <TeamSide
          className="schedule-match-line__side-a"
          teamName={display.sideA.teamName}
          players={display.sideA.players}
          playerKeys={display.sideA.playerKeys}
          highlightedPlayer={highlightedPlayer}
        />
        <span className="schedule-match-line__vs shrink-0 text-[0.62rem] font-semibold text-[var(--muted)]">
          VS
        </span>
        <TeamSide
          className="schedule-match-line__side-b"
          teamName={display.sideB.teamName}
          players={display.sideB.players}
          playerKeys={display.sideB.playerKeys}
          highlightedPlayer={highlightedPlayer}
        />
      </div>
    </div>
  );
}

function FreeMatchLine({
  match,
  highlightedPlayer,
}: {
  match: ScheduleMatch;
  highlightedPlayer?: string | null;
}) {
  if (!match.teamA || !match.teamB || !match.type) return null;

  return (
    <div className="schedule-match-line schedule-match-line--compact m-0 text-[0.8rem] leading-snug">
      <MatchTypeBadge type={match.type} label={parseTypeLabel(match.type)} />
      <div className="schedule-match-line__body">
        <PlayerPair
          className="schedule-match-line__side-a"
          players={match.teamA}
          highlightedPlayer={highlightedPlayer}
        />
        <span className="schedule-match-line__vs shrink-0 text-[0.62rem] font-semibold text-[var(--muted)]">
          VS
        </span>
        <PlayerPair
          className="schedule-match-line__side-b"
          players={match.teamB}
          highlightedPlayer={highlightedPlayer}
        />
      </div>
    </div>
  );
}

export function ScheduleMatchView({
  match,
  inline = false,
  teamInfo,
  highlightedPlayer = null,
}: ScheduleMatchViewProps) {
  if (!match || match.empty) {
    return <span className="text-sm text-[var(--muted)]">배정 불가</span>;
  }

  if (match.pending) {
    return <span className="text-sm font-semibold text-[var(--muted)]">선수 배정</span>;
  }

  const teamDisplay = teamInfo ? parseTeamMatchDisplay(match, teamInfo) : null;

  if (teamDisplay) {
    return <TeamMatchLine display={teamDisplay} highlightedPlayer={highlightedPlayer} />;
  }

  if (match.type) {
    return <FreeMatchLine match={match} highlightedPlayer={highlightedPlayer} />;
  }

  const text = formatMatchText(match);
  if (inline) {
    return <span className="text-[0.8rem] text-[var(--text)]">{text}</span>;
  }

  return <p className="m-0 text-[0.8rem] leading-snug text-[var(--text)]">{text}</p>;
}
