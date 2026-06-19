import { makeMatchKey, type MatchScores } from "@/lib/match-scores";
import { compareScoreRanking } from "@/lib/score-ranking";
import { formatPlayerShortName } from "@/lib/team-stats";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

export interface PlayerScoreTotal {
  player: string;
  totalPoints: number;
  scoredMatches: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface PlayerScoreRankingEntry extends PlayerScoreTotal {
  displayName: string;
}

export interface TeamScoreRankingGroup {
  teamName: string;
  males: PlayerScoreRankingEntry[];
  females: PlayerScoreRankingEntry[];
}

type PlayerStats = Omit<PlayerScoreTotal, "player">;

function emptyPlayerStats(): PlayerStats {
  return { totalPoints: 0, scoredMatches: 0, wins: 0, losses: 0, ties: 0 };
}

export function formatPlayerRecord(item: Pick<PlayerScoreTotal, "wins" | "losses" | "ties">): string {
  const parts = [`${item.wins}승`, `${item.losses}패`];
  if (item.ties > 0) {
    parts.push(`${item.ties}무`);
  }
  return parts.join(" ");
}

function applySideResult(stats: PlayerStats, sideScore: number, oppScore: number): PlayerStats {
  return {
    totalPoints: stats.totalPoints + sideScore,
    scoredMatches: stats.scoredMatches + 1,
    wins: stats.wins + (sideScore > oppScore ? 1 : 0),
    losses: stats.losses + (sideScore < oppScore ? 1 : 0),
    ties: stats.ties + (sideScore === oppScore ? 1 : 0),
  };
}

function buildScoreTotalsMap(
  schedule: ScheduleMatch[],
  matchScores: MatchScores
): Map<string, PlayerStats> {
  const totals = new Map<string, PlayerStats>();

  for (const match of schedule) {
    if (match.empty || !match.teamA || !match.teamB) continue;

    const score = matchScores[makeMatchKey(match.time, match.court)];
    if (!score) continue;

    for (const player of match.teamA) {
      const current = totals.get(player) ?? emptyPlayerStats();
      totals.set(player, applySideResult(current, score.a, score.b));
    }

    for (const player of match.teamB) {
      const current = totals.get(player) ?? emptyPlayerStats();
      totals.set(player, applySideResult(current, score.b, score.a));
    }
  }

  return totals;
}

function sortScoreRankingEntries(items: PlayerScoreRankingEntry[]): PlayerScoreRankingEntry[] {
  return [...items].sort(
    (a, b) => compareScoreRanking(a, b) || a.displayName.localeCompare(b.displayName, "ko")
  );
}

function toScoreRankingEntries(
  players: string[],
  totals: Map<string, PlayerStats>,
  teamName?: string
): PlayerScoreRankingEntry[] {
  return sortScoreRankingEntries(
    players.map((player) => ({
      player,
      displayName: teamName ? formatPlayerShortName(player, teamName) : player,
      ...(totals.get(player) ?? emptyPlayerStats()),
    }))
  );
}

export function computePlayerScoreTotals(
  schedule: ScheduleMatch[],
  matchScores: MatchScores
): PlayerScoreTotal[] {
  const totals = buildScoreTotalsMap(schedule, matchScores);

  return [...totals.entries()]
    .map(([player, value]) => ({
      player,
      ...value,
    }))
    .sort(
      (a, b) =>
        compareScoreRanking(a, b) || a.player.localeCompare(b.player, "ko")
    );
}

export function computeTeamScoreRankingGroups(
  schedule: ScheduleMatch[],
  matchScores: MatchScores,
  teamInfo: TeamScheduleInfo
): TeamScoreRankingGroup[] {
  const totals = buildScoreTotalsMap(schedule, matchScores);

  return [
    {
      teamName: teamInfo.teamAName,
      males: toScoreRankingEntries(teamInfo.teamAMales, totals, teamInfo.teamAName),
      females: toScoreRankingEntries(teamInfo.teamAFemales, totals, teamInfo.teamAName),
    },
    {
      teamName: teamInfo.teamBName,
      males: toScoreRankingEntries(teamInfo.teamBMales, totals, teamInfo.teamBName),
      females: toScoreRankingEntries(teamInfo.teamBFemales, totals, teamInfo.teamBName),
    },
  ];
}

export function computeFreeScoreRankingGroups(
  schedule: ScheduleMatch[],
  matchScores: MatchScores,
  males: string[],
  females: string[]
): TeamScoreRankingGroup {
  const totals = buildScoreTotalsMap(schedule, matchScores);

  return {
    teamName: "",
    males: toScoreRankingEntries(males, totals),
    females: toScoreRankingEntries(females, totals),
  };
}

export function hasScoreRankingEntries(groups: TeamScoreRankingGroup[]): boolean {
  return groups.some(
    (group) =>
      group.males.some((item) => item.scoredMatches > 0) ||
      group.females.some((item) => item.scoredMatches > 0)
  );
}

export function hasRecordedScores(matchScores: MatchScores): boolean {
  return Object.keys(matchScores).length > 0;
}

export function areAllMatchesScored(schedule: ScheduleMatch[], matchScores: MatchScores): boolean {
  const playable = schedule.filter((match) => !match.empty && match.teamA && match.teamB);
  if (playable.length === 0) return false;

  return playable.every((match) => !!matchScores[makeMatchKey(match.time, match.court)]);
}
