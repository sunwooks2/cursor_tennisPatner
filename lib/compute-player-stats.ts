import { incrementNestedCount } from "@/lib/schedule-common";
import { isPlayableMatch } from "@/lib/match-utils";
import type { MatchType, PlayerStat, ScheduleMatch } from "@/lib/types";

const emptyTypeCounts = (): Record<MatchType, number> => ({ MD: 0, WD: 0, MXD: 0 });

export function computePlayerStatsFromSchedule(
  schedule: ScheduleMatch[],
  allPlayers: string[]
): PlayerStat[] {
  const playCount = new Map<string, number>();
  const partnerByPlayer = new Map<string, Map<string, number>>();
  const opponentByPlayer = new Map<string, Map<string, number>>();
  const typeCountByPlayer = new Map<string, Record<MatchType, number>>();

  for (const player of allPlayers) {
    playCount.set(player, 0);
  }

  for (const match of schedule) {
    if (!isPlayableMatch(match)) continue;

    const [a1, a2] = match.teamA!;
    const [b1, b2] = match.teamB!;
    const players = [a1, a2, b1, b2];

    for (const player of players) {
      playCount.set(player, (playCount.get(player) ?? 0) + 1);
      if (!typeCountByPlayer.has(player)) typeCountByPlayer.set(player, emptyTypeCounts());
      typeCountByPlayer.get(player)![match.type!]++;
    }

    incrementNestedCount(partnerByPlayer, a1, a2);
    incrementNestedCount(partnerByPlayer, a2, a1);
    incrementNestedCount(partnerByPlayer, b1, b2);
    incrementNestedCount(partnerByPlayer, b2, b1);

    for (const a of [a1, a2]) {
      for (const b of [b1, b2]) {
        incrementNestedCount(opponentByPlayer, a, b);
        incrementNestedCount(opponentByPlayer, b, a);
      }
    }
  }

  const playCounts = allPlayers.map((player) => playCount.get(player) ?? 0);
  const maxPlay = playCounts.length ? Math.max(...playCounts) : 0;
  const minPlay = playCounts.length ? Math.min(...playCounts) : 0;

  const playerStats: PlayerStat[] = allPlayers.map((player) => ({
    player,
    totalMatches: playCount.get(player) ?? 0,
    typeCounts: typeCountByPlayer.get(player) ?? emptyTypeCounts(),
    partners: Object.fromEntries([...(partnerByPlayer.get(player) ?? new Map())]),
    opponents: Object.fromEntries([...(opponentByPlayer.get(player) ?? new Map())]),
  }));

  return playerStats;
}

export function computePlayStatFromSchedule(
  schedule: ScheduleMatch[],
  allPlayers: string[]
): { minPlay: number; maxPlay: number } {
  const playCount = new Map<string, number>();
  for (const player of allPlayers) playCount.set(player, 0);

  for (const match of schedule) {
    if (!isPlayableMatch(match)) continue;
    for (const player of [match.teamA![0], match.teamA![1], match.teamB![0], match.teamB![1]]) {
      playCount.set(player, (playCount.get(player) ?? 0) + 1);
    }
  }

  const values = allPlayers.map((player) => playCount.get(player) ?? 0);
  if (!values.length) return { minPlay: 0, maxPlay: 0 };
  return { minPlay: Math.min(...values), maxPlay: Math.max(...values) };
}
