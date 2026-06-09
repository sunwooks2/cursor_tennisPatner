import type { ScheduleInput } from "@/lib/types";

export function buildScheduleShareUrl(input: ScheduleInput, seed: number): string {
  const q = new URLSearchParams({
    m: String(input.maleCount),
    f: String(input.femaleCount),
    c: String(input.courtCount),
    s: input.startTime,
    e: input.endTime,
    d: String(input.matchMinutes),
    t: input.types.join(","),
    seed: String(seed),
  });
  if (input.maleNames.some((n) => n.trim())) {
    q.set("mn", input.maleNames.join("|"));
  }
  if (input.femaleNames.some((n) => n.trim())) {
    q.set("fn", input.femaleNames.join("|"));
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
