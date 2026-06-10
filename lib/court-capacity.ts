import type { ScheduleInput } from "./types";

/**
 * 같은 타임에 한 선수가 한 코트만 뛸 수 있을 때, 동시에 채울 수 있는 최대 코트 수.
 * 코트 1개면 제한 없음(항상 courtCount 반환).
 */
export function getMaxCourtsPerSlot(input: ScheduleInput): number {
  if (input.courtCount < 2) return input.courtCount;

  if (input.mode === "team") {
    const totalA = input.teamA.maleCount + input.teamA.femaleCount;
    const totalB = input.teamB.maleCount + input.teamB.femaleCount;
    const total = totalA + totalB;
    return Math.max(
      1,
      Math.min(Math.floor(totalA / 2), Math.floor(totalB / 2), Math.floor(total / 4))
    );
  }

  const total = input.maleCount + input.femaleCount;
  return Math.max(1, Math.floor(total / 4));
}

export function formatMaxCourtsHint(input: ScheduleInput): string | null {
  if (input.courtCount < 2) return null;
  const max = getMaxCourtsPerSlot(input);
  if (input.courtCount <= max) return null;

  if (input.mode === "team") {
    const totalA = input.teamA.maleCount + input.teamA.femaleCount;
    const totalB = input.teamB.maleCount + input.teamB.femaleCount;
    return `같은 타임에 한 선수는 한 코트만 배정됩니다. 현재 인원(팀A ${totalA}명·팀B ${totalB}명)으로는 타임당 최대 ${max}코트까지 가능해, 코트${max + 1}번 이후는 비게 됩니다.`;
  }

  const total = input.maleCount + input.femaleCount;
  return `같은 타임에 한 선수는 한 코트만 배정됩니다. 현재 ${total}명으로는 타임당 최대 ${max}코트까지 가능해, 코트${max + 1}번 이후는 비게 됩니다.`;
}
