import type { ScheduleInput } from "@/lib/types";

function appendTeamRosterParams(q: URLSearchParams, prefix: string, roster: ScheduleInput["teamA"]): void {
  q.set(`${prefix}m`, String(roster.maleCount));
  q.set(`${prefix}f`, String(roster.femaleCount));
  if (roster.name.trim()) q.set(`${prefix}n`, roster.name.trim());
  if (roster.maleNames.some((n) => n.trim())) {
    q.set(`${prefix}mn`, roster.maleNames.join("|"));
  }
  if (roster.femaleNames.some((n) => n.trim())) {
    q.set(`${prefix}fn`, roster.femaleNames.join("|"));
  }
}

export function buildScheduleShareUrl(input: ScheduleInput, seed: number): string {
  const q = new URLSearchParams({
    c: String(input.courtCount),
    s: input.startTime,
    e: input.endTime,
    d: String(input.matchMinutes),
    t: input.types.join(","),
    seed: String(seed),
  });

  if (input.mode === "team") {
    q.set("mode", "team");
    appendTeamRosterParams(q, "ta", input.teamA);
    appendTeamRosterParams(q, "tb", input.teamB);
  } else {
    q.set("m", String(input.maleCount));
    q.set("f", String(input.femaleCount));
    if (input.maleNames.some((n) => n.trim())) {
      q.set("mn", input.maleNames.join("|"));
    }
    if (input.femaleNames.some((n) => n.trim())) {
      q.set("fn", input.femaleNames.join("|"));
    }
  }

  return `${window.location.origin}?${q.toString()}`;
}

export type ShareResult = "shared" | "copied";

export async function shareScheduleLink(url: string): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "테니스 대진표",
        text: "테니스 대진표를 확인해보세요.",
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
    }
  }

  await navigator.clipboard.writeText(url);
  return "copied";
}
