import { NextResponse } from "next/server";
import { postToGoogleScript } from "@/lib/google-script-server";

const FEEDBACK_TYPES = ["버그", "개선", "기능 추가", "기타"] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number];

function isFeedbackType(value: string): value is FeedbackType {
  return (FEEDBACK_TYPES as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.website) {
      return NextResponse.json({ ok: true });
    }

    const type = String(body.type ?? "").trim();
    const content = String(body.content ?? "").trim();
    const contact = String(body.contact ?? "").trim();
    const pageUrl = String(body.pageUrl ?? "").trim();

    if (!isFeedbackType(type)) {
      return NextResponse.json({ ok: false, error: "유형을 선택해주세요." }, { status: 400 });
    }
    if (content.length < 5) {
      return NextResponse.json({ ok: false, error: "내용을 5자 이상 입력해주세요." }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ ok: false, error: "내용은 2000자 이내로 입력해주세요." }, { status: 400 });
    }
    if (contact.length > 100) {
      return NextResponse.json({ ok: false, error: "연락처는 100자 이내로 입력해주세요." }, { status: 400 });
    }

    const result = await postToGoogleScript({ type, content, contact, pageUrl, note: "" });

    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: "의견 저장에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
