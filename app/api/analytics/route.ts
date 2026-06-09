import { NextResponse } from "next/server";
import { postToGoogleScript } from "@/lib/google-script-server";
import { getClientIp, parseUserAgent } from "@/lib/request-context";

const MAX_EVENT_LENGTH = 50;
const MAX_META_JSON_LENGTH = 500;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.website) {
      return NextResponse.json({ ok: true });
    }

    const event = String(body.event ?? "").trim();
    const pageUrl = String(body.pageUrl ?? "").trim();
    const referrer = String(body.referrer ?? "").trim();
    const meta = body.meta;

    if (!event) {
      return NextResponse.json({ ok: false, error: "이벤트가 없습니다." }, { status: 400 });
    }
    if (event.length > MAX_EVENT_LENGTH) {
      return NextResponse.json({ ok: false, error: "이벤트명이 너무 깁니다." }, { status: 400 });
    }
    if (pageUrl.length > 2000) {
      return NextResponse.json({ ok: false, error: "URL이 너무 깁니다." }, { status: 400 });
    }
    if (referrer.length > 2000) {
      return NextResponse.json({ ok: false, error: "referrer가 너무 깁니다." }, { status: 400 });
    }

    let metaPayload: Record<string, unknown> | string | undefined;
    if (meta !== undefined && meta !== null && meta !== "") {
      if (typeof meta === "object" && !Array.isArray(meta)) {
        metaPayload = meta as Record<string, unknown>;
      } else if (typeof meta === "string") {
        metaPayload = meta;
      } else {
        return NextResponse.json({ ok: false, error: "meta 형식이 올바르지 않습니다." }, { status: 400 });
      }
      if (JSON.stringify(metaPayload).length > MAX_META_JSON_LENGTH) {
        return NextResponse.json({ ok: false, error: "meta가 너무 깁니다." }, { status: 400 });
      }
    }

    const userAgent = req.headers.get("user-agent") ?? "";
    const { device, platform } = parseUserAgent(userAgent);

    const result = await postToGoogleScript({
      kind: "event",
      event,
      pageUrl,
      referrer,
      meta: metaPayload ?? "",
      ip: getClientIp(req),
      device,
      platform,
    });

    if (!result.ok) {
      if (result.error === "missing_url") {
        return NextResponse.json({ ok: false, error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: "이벤트 저장에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
