import { parseTypeLabel } from "@/lib/schedule-common";
import { formatMatchText } from "@/lib/schedule";
import { getMatchTypeBadgeClass } from "@/lib/match-theme";
import { parseTeamMatchDisplay } from "@/lib/team-stats";
import type { MatchType, ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

interface ScheduleMatchViewProps {
  match?: ScheduleMatch;
  inline?: boolean;
  teamInfo?: TeamScheduleInfo;
}

function MatchTypeBadge({ type, label }: { type: MatchType; label: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-px text-[0.65rem] font-semibold ${getMatchTypeBadgeClass(type)}`}
    >
      {label}
    </span>
  );
}

function TeamSide({
  teamName,
  players,
}: {
  teamName: string;
  players: [string, string];
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
      <span className="font-semibold text-[var(--text)]">{teamName}</span>
      <span className="text-[var(--muted)]">
        {players[0]}·{players[1]}
      </span>
    </span>
  );
}

function TeamMatchLine({ display }: { display: NonNullable<ReturnType<typeof parseTeamMatchDisplay>> }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8rem] leading-snug">
      <MatchTypeBadge type={display.type} label={display.typeLabel} />
      <TeamSide teamName={display.sideA.teamName} players={display.sideA.players} />
      <span className="shrink-0 text-[0.62rem] font-semibold text-[var(--muted)]">VS</span>
      <TeamSide teamName={display.sideB.teamName} players={display.sideB.players} />
    </p>
  );
}

function FreeMatchLine({ match }: { match: ScheduleMatch }) {
  if (!match.teamA || !match.teamB || !match.type) return null;

  return (
    <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8rem] leading-snug">
      <MatchTypeBadge type={match.type} label={parseTypeLabel(match.type)} />
      <span className="text-[var(--text)]">
        {match.teamA[0]}·{match.teamA[1]}
      </span>
      <span className="shrink-0 text-[0.62rem] font-semibold text-[var(--muted)]">VS</span>
      <span className="text-[var(--text)]">
        {match.teamB[0]}·{match.teamB[1]}
      </span>
    </p>
  );
}

export function ScheduleMatchView({ match, inline = false, teamInfo }: ScheduleMatchViewProps) {
  if (!match || match.empty) {
    return <span className="text-sm text-[var(--muted)]">-</span>;
  }

  const teamDisplay = teamInfo ? parseTeamMatchDisplay(match, teamInfo) : null;

  if (teamDisplay) {
    return <TeamMatchLine display={teamDisplay} />;
  }

  if (match.type) {
    return <FreeMatchLine match={match} />;
  }

  const text = formatMatchText(match);
  if (inline) {
    return <span className="text-[0.8rem] text-[var(--text)]">{text}</span>;
  }

  return <p className="m-0 text-[0.8rem] leading-snug text-[var(--text)]">{text}</p>;
}
