import { makeMatchKey, type MatchDoubleFaults, type MatchScores } from "@/lib/match-scores";
import { formatPlayerShortName } from "@/lib/team-stats";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

export interface PlayerDoubleFaultTotal {
  player: string;
  displayName: string;
  total: number;
}

export const DOUBLE_FAULT_FINE_WON = 500;

export function formatDoubleFaultAmount(count: number): string {
  return `${(count * DOUBLE_FAULT_FINE_WON).toLocaleString("ko-KR")}원`;
}

export interface TeamDoubleFaultGroup {
  teamName: string;
  males: PlayerDoubleFaultTotal[];
  females: PlayerDoubleFaultTotal[];
}

function sortByDoubleFaults(items: PlayerDoubleFaultTotal[]): PlayerDoubleFaultTotal[] {
  return [...items].sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName, "ko"));
}

function buildPlayerTotals(
  schedule: ScheduleMatch[],
  matchScores: MatchScores
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const match of schedule) {
    if (match.empty || !match.teamA || !match.teamB) continue;

    const key = makeMatchKey(match.time, match.court);
    const score = matchScores[key];
    if (!score?.df) continue;

    const entries: [string, number][] = [
      [match.teamA[0], score.df.teamA[0]],
      [match.teamA[1], score.df.teamA[1]],
      [match.teamB[0], score.df.teamB[0]],
      [match.teamB[1], score.df.teamB[1]],
    ];

    for (const [player, count] of entries) {
      if (count <= 0) continue;
      totals.set(player, (totals.get(player) ?? 0) + count);
    }
  }

  return totals;
}

function toPlayerTotals(
  players: string[],
  totals: Map<string, number>,
  teamName?: string
): PlayerDoubleFaultTotal[] {
  return sortByDoubleFaults(
    players.map((player) => ({
      player,
      displayName: teamName ? formatPlayerShortName(player, teamName) : player,
      total: totals.get(player) ?? 0,
    }))
  );
}

export function hasRecordedDoubleFaults(matchScores: MatchScores): boolean {
  return Object.values(matchScores).some((score) => score.df !== undefined);
}

export function computeTeamDoubleFaultGroups(
  schedule: ScheduleMatch[],
  matchScores: MatchScores,
  males: string[],
  teamInfo: TeamScheduleInfo
): TeamDoubleFaultGroup[] {
  const totals = buildPlayerTotals(schedule, matchScores);

  return [
    {
      teamName: teamInfo.teamAName,
      males: toPlayerTotals(teamInfo.teamAMales, totals, teamInfo.teamAName),
      females: toPlayerTotals(teamInfo.teamAFemales, totals, teamInfo.teamAName),
    },
    {
      teamName: teamInfo.teamBName,
      males: toPlayerTotals(teamInfo.teamBMales, totals, teamInfo.teamBName),
      females: toPlayerTotals(teamInfo.teamBFemales, totals, teamInfo.teamBName),
    },
  ];
}

export function computeFreeDoubleFaultGroups(
  schedule: ScheduleMatch[],
  matchScores: MatchScores,
  males: string[],
  females: string[]
): TeamDoubleFaultGroup {
  const totals = buildPlayerTotals(schedule, matchScores);

  return {
    teamName: "",
    males: toPlayerTotals(males, totals),
    females: toPlayerTotals(females, totals),
  };
}

export function hasDoubleFaultEntries(groups: TeamDoubleFaultGroup[]): boolean {
  return groups.some(
    (group) =>
      group.males.some((item) => item.total > 0) || group.females.some((item) => item.total > 0)
  );
}

export function summarizeDoubleFaults(df: MatchDoubleFaults): boolean {
  return df.teamA[0] + df.teamA[1] + df.teamB[0] + df.teamB[1] > 0;
}
