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

/** 같은 타임(코트 2개 이상)에 이미 배정된 선수 */
export type SlotBusyPlayers = Set<string>;

export function createSlotBusy(): SlotBusyPlayers {
  return new Set();
}

export function isMatchSlotAvailable(players: string[], slotBusy: ReadonlySet<string>): boolean {
  return !players.some((p) => slotBusy.has(p));
}

export function occupySlotPlayers(slotBusy: SlotBusyPlayers, players: string[]): void {
  for (const p of players) slotBusy.add(p);
}

export function excludeBusyPlayers(players: string[], slotBusy: ReadonlySet<string>): string[] {
  if (slotBusy.size === 0) return players;
  return players.filter((p) => !slotBusy.has(p));
}

export type TypeCountRecord = Record<MatchType, number>;

export function emptyTypeCounts(): TypeCountRecord {
  return { MD: 0, WD: 0, MXD: 0 };
}

/** 페어 반복(×5)보다 낮고, 상대 반복(×3)과 동급 */
export const TYPE_BALANCE_PENALTY_WEIGHT = 3;

function typesForPlayer(player: string, males: readonly string[], activeTypes: readonly MatchType[]): MatchType[] {
  const isMale = males.includes(player);
  return activeTypes.filter((type) => {
    if (type === "MD") return isMale;
    if (type === "WD") return !isMale;
    return true;
  });
}

/**
 * 선택된 유형이 2개 이상일 때, 선수별 유형 편중(남복만/혼복만 등)을 줄이기 위한 패널티.
 * 경기 배정 후 각 선수의 참여 가능 유형별 경기수 max−min 합계.
 */
export function computeTypeBalancePenalty(
  players: string[],
  matchType: MatchType,
  typeCountByPlayer: ReadonlyMap<string, TypeCountRecord>,
  activeTypes: readonly MatchType[],
  males: readonly string[]
): number {
  let penalty = 0;
  for (const player of players) {
    const playerTypes = typesForPlayer(player, males, activeTypes);
    if (playerTypes.length < 2) continue;

    const counts = typeCountByPlayer.get(player) ?? emptyTypeCounts();
    const projected = { ...counts, [matchType]: counts[matchType] + 1 };
    const values = playerTypes.map((type) => projected[type]);
    penalty += Math.max(...values) - Math.min(...values);
  }
  return penalty;
}
