import { NextResponse } from "next/server";
import { postToGoogleScript } from "@/lib/google-script-server";
import {
  getMatchScoreValidationError,
  isValidScoreValue,
  MAX_MATCH_SCORE,
  normalizeDoubleFaults,
  normalizeMatchScores,
  normalizeTimeLabel,
} from "@/lib/match-scores";

const MAX_EID_LENGTH = 32;
const MAX_TIME_LENGTH = 10;

function normalizeEid(value: unknown): string | null {
  const eid = String(value ?? "").trim();
  if (!eid || eid.length > MAX_EID_LENGTH) return null;
  return eid;
}

function normalizeTime(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const time = normalizeTimeLabel(raw) ?? raw;
  if (time.length > MAX_TIME_LENGTH) return null;
  return time;
}

function normalizeCourt(value: unknown): number | null {
  const court = Number(value);
  if (!Number.isInteger(court) || court < 1 || court > 20) return null;
  return court;
}

export async function GET(req: Request) {
  try {
    const eid = normalizeEid(new URL(req.url).searchParams.get("eid"));
    if (!eid) {
      return NextResponse.json({ ok: false, error: "이벤트 ID가 없습니다." }, { status: 400 });
    }

    const result = await postToGoogleScript({ kind: "score_list", eid });
    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: "점수를 불러오지 못했습니다." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, scores: normalizeMatchScores(result.scores ?? {}) });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eid = normalizeEid(body.eid);
    const time = normalizeTime(body.time);
    const court = normalizeCourt(body.court);
    const a = Number(body.a);
    const b = Number(body.b);

    if (!eid || !time || court === null) {
      return NextResponse.json({ ok: false, error: "입력값이 올바르지 않습니다." }, { status: 400 });
    }
    if (!isValidScoreValue(a) || !isValidScoreValue(b)) {
      return NextResponse.json(
        { ok: false, error: `점수는 0~${MAX_MATCH_SCORE} 사이 정수여야 합니다.` },
        { status: 400 }
      );
    }
    const validationError = getMatchScoreValidationError(a, b);
    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    const df = normalizeDoubleFaults(body.df);
    if (body.df !== undefined && body.df !== null && !df) {
      return NextResponse.json({ ok: false, error: "더블폴트 입력값이 올바르지 않습니다." }, { status: 400 });
    }

    const result = await postToGoogleScript({
      kind: "score_save",
      eid,
      time,
      court,
      a,
      b,
      df: df ? JSON.stringify(df) : "",
    });
    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: "점수 저장에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const eid = normalizeEid(body.eid);
    const time = normalizeTime(body.time);
    const court = normalizeCourt(body.court);

    if (!eid || !time || court === null) {
      return NextResponse.json({ ok: false, error: "입력값이 올바르지 않습니다." }, { status: 400 });
    }

    const result = await postToGoogleScript({ kind: "score_delete", eid, time, court });
    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      if (result.error === "not_found") {
        return NextResponse.json({ ok: false, error: "삭제할 점수를 찾지 못했습니다." }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: "점수 삭제에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
