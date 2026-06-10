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

export function getMatchHighlightClass(
  match: ScheduleMatch | undefined,
  highlightedPlayer: string | null,
  active: boolean
): string {
  if (!active || !highlightedPlayer) return "";

  if (matchIncludesPlayer(match, highlightedPlayer)) {
    return "rounded-lg bg-[var(--highlight)] ring-1 ring-[var(--primary-border)]";
  }

  if (!match || match.empty) return "opacity-40";
  return "opacity-35";
}
