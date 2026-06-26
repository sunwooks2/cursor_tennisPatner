import type { MatchType, ScheduleMatch } from "./types";

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

/** 페어 반복(×5)보다 낮게 유지 */
export const TYPE_BALANCE_PENALTY_WEIGHT = 4;

/** 슬롯당 유형별 랜덤 후보 생성 횟수 */
export const SCHEDULE_CANDIDATE_ATTEMPTS = 60;

/** 코트별 유형 고정 선호(페어×5, 유형균형×4보다 낮음) */
export const COURT_TYPE_PENALTY_WEIGHT = 3;

/**
 * 코트별 선호 유형 배정.
 * - 코트 수 >= 유형 수: 유형 순서대로 1코트씩, 남는 코트는 마지막 유형
 * - 코트 수 < 유형 수: 앞 코트부터 유형 순서대로 1:1
 */
export function buildCourtPreferredTypes(
  courtCount: number,
  types: readonly MatchType[]
): MatchType[] {
  if (courtCount <= 0 || types.length === 0) return [];

  const preferences: MatchType[] = [];
  for (let i = 0; i < types.length && preferences.length < courtCount; i += 1) {
    preferences.push(types[i]);
  }
  const overflowType = types[types.length - 1];
  while (preferences.length < courtCount) {
    preferences.push(overflowType);
  }
  return preferences;
}

export function shouldPinCourtTypes(courtCount: number, typeCount: number): boolean {
  return courtCount >= 2 && typeCount >= 2;
}

export function computeCourtTypePenalty(
  matchType: MatchType,
  preferredCourtType: MatchType | undefined
): number {
  if (!preferredCourtType || matchType === preferredCourtType) return 0;
  return 1;
}

/** 코트 선호 유형을 먼저 시도하도록 유형 순서 구성 */
export function orderTypesForCourt(
  types: readonly MatchType[],
  preferredType: MatchType | undefined,
  rand: RandFn
): MatchType[] {
  if (!preferredType) return shuffledCopy([...types], rand);
  const rest = shuffledCopy(
    types.filter((type) => type !== preferredType),
    rand
  );
  return [preferredType, ...rest];
}

function courtTypeMatchScore(match: ScheduleMatch, preferredType: MatchType): number {
  if (match.empty || !match.type) return 0;
  return match.type === preferredType ? 1 : 0;
}

/** 같은 시간대 경기들의 코트 번호를 재배치해 선호 유형과 최대한 맞춤 */
export function optimizeCourtAssignmentsPerSlot(
  schedule: ScheduleMatch[],
  courtCount: number,
  courtPreferredTypes: readonly MatchType[]
): void {
  if (courtPreferredTypes.length === 0 || courtCount < 2) return;

  const byTime = new Map<string, ScheduleMatch[]>();
  for (const match of schedule) {
    const bucket = byTime.get(match.time);
    if (bucket) bucket.push(match);
    else byTime.set(match.time, [match]);
  }

  for (const slotMatches of byTime.values()) {
    if (slotMatches.length <= 1) continue;

    const n = slotMatches.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    let bestScore = -1;
    let bestOrder = indices;

    function search(order: number[], depth: number): void {
      if (depth === n) {
        let score = 0;
        for (let court = 0; court < n; court += 1) {
          score += courtTypeMatchScore(
            slotMatches[order[court]],
            courtPreferredTypes[court] ?? courtPreferredTypes[courtPreferredTypes.length - 1]
          );
        }
        if (score > bestScore) {
          bestScore = score;
          bestOrder = [...order];
        }
        return;
      }
      for (let i = depth; i < n; i += 1) {
        [order[depth], order[i]] = [order[i], order[depth]];
        search(order, depth + 1);
        [order[depth], order[i]] = [order[i], order[depth]];
      }
    }

    search(indices, 0);

    const reassigned = bestOrder.map((matchIdx, courtIdx) => ({
      match: slotMatches[matchIdx],
      court: courtIdx + 1,
    }));
    for (const { match, court } of reassigned) {
      match.court = court;
    }
  }
}

function typesForPlayer(player: string, males: readonly string[], activeTypes: readonly MatchType[]): MatchType[] {
  const isMale = males.includes(player);
  return activeTypes.filter((type) => {
    if (type === "MD") return isMale;
    if (type === "WD") return !isMale;
    return true;
  });
}

/**
 * 선수별 유형 편중 패널티.
 * - 편중 악화(delta)를 강하게 징벌
 * - 3:1 이상(newSpread >= 2) 추가 징벌
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
    const oldValues = playerTypes.map((type) => counts[type]);
    const oldSpread = Math.max(...oldValues) - Math.min(...oldValues);

    const projected = { ...counts, [matchType]: counts[matchType] + 1 };
    const newValues = playerTypes.map((type) => projected[type]);
    const newSpread = Math.max(...newValues) - Math.min(...newValues);

    const worsening = Math.max(0, newSpread - oldSpread);
    penalty += worsening * 4 + newSpread + (newSpread >= 2 ? newSpread * 3 : 0);
  }
  return penalty;
}
