import type { ScheduleMatch } from "@/lib/types";

export function matchIncludesPlayer(match: ScheduleMatch | undefined, player: string): boolean {
  if (!match || match.empty || !match.teamA || !match.teamB) return false;
  return match.teamA.includes(player) || match.teamB.includes(player);
}

export function slotIncludesPlayer(
  matches: ScheduleMatch[],
  player: string,
  visibleCourts: number[]
): boolean {
  return visibleCourts.some((court) => {
    const match = matches.find((item) => item.court === court);
    return matchIncludesPlayer(match, player);
  });
}

export function isRestSlotForPlayer(
  matches: ScheduleMatch[],
  player: string | null,
  visibleCourts: number[]
): boolean {
  if (!player) return false;
  return !slotIncludesPlayer(matches, player, visibleCourts);
}

