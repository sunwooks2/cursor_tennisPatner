import { makeMatchKey, type MatchScores } from "@/lib/match-scores";
import { getLeadingName } from "@/lib/score-ranking";
import { getTeamNameForPlayer } from "@/lib/team-stats";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

export interface TeamScoreTotal {
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  scoredMatches: number;
}

type TeamStats = Omit<TeamScoreTotal, "teamName">;

function emptyTeamStats(): TeamStats {
  return { wins: 0, losses: 0, ties: 0, totalPoints: 0, scoredMatches: 0 };
}

export function computeTeamScoreTotals(
  schedule: ScheduleMatch[],
  matchScores: MatchScores,
  teamInfo: TeamScheduleInfo
): TeamScoreTotal[] {
  const stats = new Map<string, TeamStats>([
    [teamInfo.teamAName, emptyTeamStats()],
    [teamInfo.teamBName, emptyTeamStats()],
  ]);

  for (const match of schedule) {
    if (match.empty || !match.teamA || !match.teamB) continue;

    const score = matchScores[makeMatchKey(match.time, match.court)];
    if (!score) continue;

    const sideATeam = getTeamNameForPlayer(match.teamA[0], teamInfo);
    const sideBTeam = getTeamNameForPlayer(match.teamB[0], teamInfo);
    const sideAStats = stats.get(sideATeam);
    const sideBStats = stats.get(sideBTeam);
    if (!sideAStats || !sideBStats) continue;

    sideAStats.totalPoints += score.a;
    sideBStats.totalPoints += score.b;
    sideAStats.scoredMatches += 1;
    sideBStats.scoredMatches += 1;

    if (score.a > score.b) {
      sideAStats.wins += 1;
      sideBStats.losses += 1;
    } else if (score.b > score.a) {
      sideBStats.wins += 1;
      sideAStats.losses += 1;
    } else {
      sideAStats.ties += 1;
      sideBStats.ties += 1;
    }
  }

  return [teamInfo.teamAName, teamInfo.teamBName].map((teamName) => ({
    teamName,
    ...stats.get(teamName)!,
  }));
}

export function getLeadingTeamName(teams: TeamScoreTotal[]): string | null {
  return getLeadingName(teams, (team) => team.teamName);
}
