"use client";

import type { GeneratedSchedule, ScheduleInput, ScheduleMatch } from "@/lib/types";

export async function downloadPrintLayoutExcel(
  input: ScheduleInput,
  generated: GeneratedSchedule,
  slotMap: Map<string, ScheduleMatch[]>,
  filename: string
): Promise<void> {
  const res = await fetch("/api/export-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      generated,
      slotMap: [...slotMap.entries()],
    }),
  });

  if (!res.ok) {
    throw new Error("엑셀 생성에 실패했습니다.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
