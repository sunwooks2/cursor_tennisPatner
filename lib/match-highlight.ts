import type { ScheduleMatch } from "@/lib/types";

export function matchIncludesPlayer(match: ScheduleMatch | undefined, player: string): boolean {
  if (!match || match.empty || !match.teamA || !match.teamB) return false;
  return match.teamA.includes(player) || match.teamB.includes(player);
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
