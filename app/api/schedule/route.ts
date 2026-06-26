import { NextResponse } from "next/server";
import { parseManualSchedule } from "@/lib/schedule-manual";
import { postToGoogleScript } from "@/lib/google-script-server";
import type { ManualLayout } from "@/lib/types";

const MAX_EID_LENGTH = 32;
const MAX_PAYLOAD_LENGTH = 200_000;

function normalizeEid(value: unknown): string | null {
  const eid = String(value ?? "").trim();
  if (!eid || eid.length > MAX_EID_LENGTH) return null;
  return eid;
}

function normalizeSchedulePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const raw = value as {
    mode?: string;
    manualLayout?: string;
    schedule?: unknown;
  };
  if (raw.mode !== "manual") return null;
  const manualLayout: ManualLayout = raw.manualLayout === "team" ? "team" : "free";
  const schedule = parseManualSchedule(raw.schedule);
  if (!schedule) return null;
  return { mode: "manual" as const, manualLayout, schedule };
}

export async function GET(req: Request) {
  try {
    const eid = normalizeEid(new URL(req.url).searchParams.get("eid"));
    if (!eid) {
      return NextResponse.json({ ok: false, error: "이벤트 ID가 없습니다." }, { status: 400 });
    }

    const result = await postToGoogleScript({ kind: "schedule_get", eid });
    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: "대진표를 불러오지 못했습니다." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      schedule: normalizeSchedulePayload(result.schedule ?? null),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eid = normalizeEid(body.eid);
    const schedule = normalizeSchedulePayload(body.schedule);

    if (!eid || !schedule) {
      return NextResponse.json({ ok: false, error: "입력값이 올바르지 않습니다." }, { status: 400 });
    }

    const payload = JSON.stringify(schedule);
    if (payload.length > MAX_PAYLOAD_LENGTH) {
      return NextResponse.json({ ok: false, error: "저장할 데이터가 너무 큽니다." }, { status: 400 });
    }

    const result = await postToGoogleScript({ kind: "schedule_save", eid, schedule: payload });
    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: "대진표 저장에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
