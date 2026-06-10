import type { MatchType, PlayerStat } from "@/lib/types";

export function isMalePlayer(player: string, males: string[]): boolean {
  return males.includes(player);
}

export function formatRelevantTypeCounts(
  typeCounts: Record<MatchType, number>,
  isMale: boolean,
  includeZero = false
): string {
  const parts: string[] = [];
  if (isMale) {
    if (includeZero || typeCounts.MD > 0) parts.push(`남복 ${typeCounts.MD}`);
    if (includeZero || typeCounts.MXD > 0) parts.push(`혼복 ${typeCounts.MXD}`);
  } else {
    if (includeZero || typeCounts.WD > 0) parts.push(`여복 ${typeCounts.WD}`);
    if (includeZero || typeCounts.MXD > 0) parts.push(`혼복 ${typeCounts.MXD}`);
  }
  return parts.join(" · ");
}
