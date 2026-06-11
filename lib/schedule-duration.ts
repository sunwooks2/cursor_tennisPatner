import { toClock, toMinute } from "./schedule-common";

export const DURATION_HOUR_OPTIONS = [2, 3, 4, 5, 6] as const;
export type DurationHours = (typeof DURATION_HOUR_OPTIONS)[number];

export function addHoursToTime(time: string, hours: number): string {
  return toClock(toMinute(time) + hours * 60);
}

export function inferDurationHours(startTime: string, endTime: string): DurationHours | null {
  const diffHours = (toMinute(endTime) - toMinute(startTime)) / 60;
  if (!Number.isInteger(diffHours)) return null;
  return DURATION_HOUR_OPTIONS.includes(diffHours as DurationHours)
    ? (diffHours as DurationHours)
    : null;
}
