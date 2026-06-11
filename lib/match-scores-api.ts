import { normalizeMatchScores, type MatchScores } from "@/lib/match-scores";

type ScoresResponse = {
  ok: boolean;
  error?: string;
  scores?: MatchScores;
};

export async function fetchMatchScores(eventId: string): Promise<MatchScores> {
  const res = await fetch(`/api/scores?eid=${encodeURIComponent(eventId)}`);
  const data = (await res.json()) as ScoresResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "점수를 불러오지 못했습니다.");
  }
  return normalizeMatchScores(data.scores ?? {});
}

export async function saveMatchScore(
  eventId: string,
  time: string,
  court: number,
  a: number,
  b: number
): Promise<void> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eid: eventId, time, court, a, b }),
  });
  const data = (await res.json()) as ScoresResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "점수 저장에 실패했습니다.");
  }
}

export async function clearMatchScore(eventId: string, time: string, court: number): Promise<void> {
  const res = await fetch("/api/scores", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eid: eventId, time, court }),
  });
  const data = (await res.json()) as ScoresResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "점수 삭제에 실패했습니다.");
  }
}
