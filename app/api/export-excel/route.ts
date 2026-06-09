import { NextResponse } from "next/server";
import { buildExcelBuffer } from "@/lib/export-excel";
import type { GeneratedSchedule, ScheduleInput, ScheduleMatch } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body.input as ScheduleInput;
    const generated = body.generated as GeneratedSchedule;
    const slotMapEntries = body.slotMap as [string, ScheduleMatch[]][];

    if (!input || !generated || !Array.isArray(slotMapEntries)) {
      return NextResponse.json({ ok: false, error: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
    }

    const slotMap = new Map<string, ScheduleMatch[]>(slotMapEntries);
    const buffer = await buildExcelBuffer(input, generated, slotMap);

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="tennis-schedule.xlsx"',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "엑셀 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
