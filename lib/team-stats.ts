import { parseTypeLabel } from "./schedule-common";
import type { MatchType, ScheduleMatch, TeamScheduleInfo } from "./types";

export function getTeamMalePrefix(teamName: string): string {
  const name = teamName.trim();
  return name ? `${name} 남` : "남";
}

export function getTeamFemalePrefix(teamName: string): string {
  const name = teamName.trim();
  return name ? `${name} 여` : "여";
}

export function stripTeamPrefixFromPlayerName(teamName: string, playerName: string): string {
  const team = teamName.trim();
  const name = String(playerName ?? "").trim();
  if (!team || !name) return name;
  const prefix = `${team} `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function formatTeamPlayerKey(teamName: string, customName: string): string {
  const team = teamName.trim();
  const custom = String(customName ?? "").trim();
  if (!custom) return "";
  if (!team) return custom;
  const prefix = `${team} `;
  return custom.startsWith(prefix) ? custom : `${team} ${custom}`;
}

export function buildTeamPlayers(
  teamName: string,
  gender: "남" | "여",
  count: number,
  names: string[] = []
): string[] {
  const team = teamName.trim();
  const slotPrefix = team ? `${team} ${gender}` : gender;
  return Array.from({ length: count }, (_, idx) => {
    const custom = names[idx]?.trim();
    if (!custom) return `${slotPrefix}${idx + 1}`;
    return formatTeamPlayerKey(team, custom);
  });
}

export function getTeamNameForPlayer(player: string, teamInfo: TeamScheduleInfo): string {
  if (isTeamAPlayer(player, teamInfo)) return teamInfo.teamAName;
  return teamInfo.teamBName;
}

export function formatPlayerShortName(player: string, teamName: string): string {
  const prefix = `${teamName} `;
  return player.startsWith(prefix) ? player.slice(prefix.length) : player;
}

export type TeamMatchSide = {
  teamName: string;
  players: [string, string];
  playerKeys: [string, string];
};

export type TeamMatchDisplay = {
  type: MatchType;
  typeLabel: string;
  sideA: TeamMatchSide;
  sideB: TeamMatchSide;
};

export function parseTeamMatchDisplay(
  match: ScheduleMatch,
  teamInfo: TeamScheduleInfo
): TeamMatchDisplay | null {
  if (match.empty || !match.teamA || !match.teamB || !match.type) return null;

  const [a1, a2] = match.teamA;
  const [b1, b2] = match.teamB;
  const teamAName = getTeamNameForPlayer(a1, teamInfo);
  const teamBName = getTeamNameForPlayer(b1, teamInfo);

  return {
    type: match.type,
    typeLabel: parseTypeLabel(match.type),
    sideA: {
      teamName: teamAName,
      players: [formatPlayerShortName(a1, teamAName), formatPlayerShortName(a2, teamAName)],
      playerKeys: [a1, a2],
    },
    sideB: {
      teamName: teamBName,
      players: [formatPlayerShortName(b1, teamBName), formatPlayerShortName(b2, teamBName)],
      playerKeys: [b1, b2],
    },
  };
}

export function formatTeamMatchText(match: ScheduleMatch, teamInfo: TeamScheduleInfo): string {
  const display = parseTeamMatchDisplay(match, teamInfo);
  if (!display) return "배정 실패";

  const { typeLabel, sideA, sideB } = display;
  return `[${sideA.teamName}] ${sideA.players[0]} / ${sideA.players[1]} VS [${sideB.teamName}] ${sideB.players[0]} / ${sideB.players[1]} (${typeLabel})`;
}

export function isTeamAPlayer(player: string, teamInfo: TeamScheduleInfo): boolean {
  return teamInfo.teamAMales.includes(player) || teamInfo.teamAFemales.includes(player);
}

export function getSameTeamPlayers(player: string, teamInfo: TeamScheduleInfo): string[] {
  if (isTeamAPlayer(player, teamInfo)) {
    return [...teamInfo.teamAMales, ...teamInfo.teamAFemales];
  }
  return [...teamInfo.teamBMales, ...teamInfo.teamBFemales];
}

export function getOpposingTeamPlayers(player: string, teamInfo: TeamScheduleInfo): string[] {
  if (isTeamAPlayer(player, teamInfo)) {
    return [...teamInfo.teamBMales, ...teamInfo.teamBFemales];
  }
  return [...teamInfo.teamAMales, ...teamInfo.teamAFemales];
}

export function buildRelationCounts(
  player: string,
  candidates: string[],
  counts: Record<string, number>
): [string, number][] {
  return candidates
    .filter((name) => name !== player)
    .map((name) => [name, counts[name] ?? 0] as [string, number]);
}
