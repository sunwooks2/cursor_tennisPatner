import type { MatchType } from "./types";

export type RandFn = () => number;

export function makeRng(seed: number): RandFn {
  let t = seed + 0x6d2b79f5;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function toMinute(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toClock(minute: number): string {
  const h = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const m = (minute % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function makeTimeSlots(startTime: string, endTime: string, matchMinutes: number): string[] {
  const start = toMinute(startTime);
  const end = toMinute(endTime);
  const slots: string[] = [];
  for (let cur = start; cur + matchMinutes <= end; cur += matchMinutes) {
    slots.push(toClock(cur));
  }
  return slots;
}

export function buildPlayers(prefix: string, count: number, names: string[] = []): string[] {
  return Array.from({ length: count }, (_, idx) => {
    const custom = names[idx]?.trim();
    return custom || `${prefix}${idx + 1}`;
  });
}

export function shuffledCopy<T>(list: T[], rand: RandFn): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function parseTypeLabel(type: MatchType): string {
  if (type === "MD") return "남복";
  if (type === "WD") return "여복";
  return "혼복";
}

export function incrementNestedCount(
  map: Map<string, Map<string, number>>,
  from: string,
  to: string
): void {
  if (!map.has(from)) map.set(from, new Map());
  const inner = map.get(from)!;
  inner.set(to, (inner.get(to) || 0) + 1);
}
