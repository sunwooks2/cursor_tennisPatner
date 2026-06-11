export interface ScoreRankingStats {
  wins: number;
  losses: number;
  totalPoints: number;
  scoredMatches: number;
}

export function compareScoreRanking(a: ScoreRankingStats, b: ScoreRankingStats): number {
  return (
    b.wins - a.wins ||
    a.losses - b.losses ||
    b.totalPoints - a.totalPoints ||
    b.scoredMatches - a.scoredMatches
  );
}

export function getLeadingName<T extends ScoreRankingStats>(
  entries: T[],
  getName: (entry: T) => string
): string | null {
  if (entries.length < 2) return null;

  const leader = entries.reduce((best, current) =>
    compareScoreRanking(current, best) < 0 ? current : best
  );

  const tiedWithLeader = entries.some(
    (entry) => entry !== leader && compareScoreRanking(entry, leader) === 0
  );

  return tiedWithLeader ? null : getName(leader);
}
