import type { ScheduleMatch } from "@/lib/types";

export function isPendingMatch(match?: ScheduleMatch): boolean {
  return Boolean(match && !match.empty && match.pending);
}

export function isPlayableMatch(match?: ScheduleMatch): boolean {
  return Boolean(
    match &&
      !match.empty &&
      !match.pending &&
      match.type &&
      match.teamA &&
      match.teamB
  );
}

export function getMatchPlayers(match: ScheduleMatch): string[] {
  if (!isPlayableMatch(match)) return [];
  return [match.teamA![0], match.teamA![1], match.teamB![0], match.teamB![1]];
}

export function getBusyPlayersAtTime(schedule: ScheduleMatch[], time: string): Set<string> {
  const busy = new Set<string>();
  for (const match of schedule) {
    if (match.time !== time) continue;
    for (const player of getMatchPlayers(match)) {
      busy.add(player);
    }
  }
  return busy;
}
