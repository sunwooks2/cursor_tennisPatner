export interface PersistedSchedulePayload {
  mode: "manual";
  manualLayout: "free" | "team";
  schedule: Array<{
    time: string;
    court: number;
    empty?: boolean;
    pending?: boolean;
    type?: string;
    teamA?: [string, string];
    teamB?: [string, string];
  }>;
}

export async function fetchEventSchedule(eventId: string): Promise<PersistedSchedulePayload | null> {
  const res = await fetch(`/api/schedule?eid=${encodeURIComponent(eventId)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "대진표를 불러오지 못했습니다.");
  }
  return data.schedule ?? null;
}

export async function saveEventSchedule(
  eventId: string,
  payload: PersistedSchedulePayload
): Promise<void> {
  const res = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eid: eventId, schedule: payload }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "대진표 저장에 실패했습니다.");
  }
}
