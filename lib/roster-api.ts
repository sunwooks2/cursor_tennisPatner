import { normalizeEventRoster, type EventRoster } from "@/lib/roster";

type RosterResponse = {
  ok: boolean;
  error?: string;
  roster?: EventRoster | null;
};

export async function fetchEventRoster(eventId: string): Promise<EventRoster | null> {
  const res = await fetch(`/api/roster?eid=${encodeURIComponent(eventId)}`);
  const data = (await res.json()) as RosterResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "선수 등록 정보를 불러오지 못했습니다.");
  }
  return normalizeEventRoster(data.roster ?? null);
}

export async function saveEventRoster(eventId: string, roster: EventRoster): Promise<void> {
  const res = await fetch("/api/roster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eid: eventId, roster }),
  });
  const data = (await res.json()) as RosterResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "선수 등록 저장에 실패했습니다.");
  }
}
