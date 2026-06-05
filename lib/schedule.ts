import type { GeneratedSchedule, MatchType, PlayerStat, ScheduleInput, ScheduleMatch } from "./types";

type RandFn = () => number;

interface MatchCandidate {
  type: MatchType;
  teamA: [string, string];
  teamB: [string, string];
  players: string[];
  score: number;
}

interface ScheduleState {
  playCount: Map<string, number>;
  partnerCount: Map<string, number>;
  oppCount: Map<string, number>;
  matchSet: Set<string>;
}

function incrementNestedCount(map: Map<string, Map<string, number>>, from: string, to: string): void {
  if (!map.has(from)) map.set(from, new Map());
  const inner = map.get(from)!;
  inner.set(to, (inner.get(to) || 0) + 1);
}

function makeRng(seed: number): RandFn {
  let t = seed + 0x6d2b79f5;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function toMinute(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toClock(minute: number): string {
  const h = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const m = (minute % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function makeTimeSlots(startTime: string, endTime: string, matchMinutes: number): string[] {
  const start = toMinute(startTime);
  const end = toMinute(endTime);
  const slots: string[] = [];
  for (let cur = start; cur + matchMinutes <= end; cur += matchMinutes) {
    slots.push(toClock(cur));
  }
  return slots;
}

function buildPlayers(prefix: string, count: number, names: string[] = []): string[] {
  return Array.from({ length: count }, (_, idx) => {
    const custom = names[idx]?.trim();
    return custom || `${prefix}${idx + 1}`;
  });
}

function shuffledCopy<T>(list: T[], rand: RandFn): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function makeMatch(
  type: MatchType,
  males: string[],
  females: string[],
  state: ScheduleState,
  rand: RandFn
): MatchCandidate | null {
  const needed =
    type === "MD" ? (["M", "M", "M", "M"] as const) : type === "WD" ? (["F", "F", "F", "F"] as const) : (["M", "M", "F", "F"] as const);
  const malePool = shuffledCopy(males, rand);
  const femalePool = shuffledCopy(females, rand);
  const selectedM: string[] = [];
  const selectedF: string[] = [];

  for (const token of needed) {
    const pool = token === "M" ? malePool : femalePool;
    const target = token === "M" ? selectedM : selectedF;
    const pick = pool.find(
      (name) => !target.includes(name) && !selectedM.includes(name) && !selectedF.includes(name)
    );
    if (!pick) return null;
    target.push(pick);
  }

  let teamA: [string, string];
  let teamB: [string, string];
  if (type === "MXD") {
    teamA = [selectedM[0], selectedF[0]];
    teamB = [selectedM[1], selectedF[1]];
  } else {
    const all = type === "MD" ? selectedM : selectedF;
    teamA = [all[0], all[1]];
    teamB = [all[2], all[3]];
  }

  const players = [...teamA, ...teamB];
  const playPenalty = players.reduce((acc, p) => acc + (state.playCount.get(p) || 0), 0);
  const partnerPenalty =
    (state.partnerCount.get(pairKey(teamA[0], teamA[1])) || 0) +
    (state.partnerCount.get(pairKey(teamB[0], teamB[1])) || 0);
  const oppPenalty =
    (state.oppCount.get(pairKey(teamA[0], teamB[0])) || 0) +
    (state.oppCount.get(pairKey(teamA[0], teamB[1])) || 0) +
    (state.oppCount.get(pairKey(teamA[1], teamB[0])) || 0) +
    (state.oppCount.get(pairKey(teamA[1], teamB[1])) || 0);
  const duplicatePenalty = state.matchSet.has(
    `${type}:${pairKey(teamA[0], teamA[1])}#${pairKey(teamB[0], teamB[1])}`
  )
    ? 1000
    : 0;

  // 균등 배분을 최우선으로 하기 위해 "이 후보를 반영했을 때"의
  // 경기 수 분포(최대-최소, 평균 편차)를 가장 큰 가중치로 반영한다.
  const projectedCounts = new Map(state.playCount);
  for (const p of players) {
    projectedCounts.set(p, (projectedCounts.get(p) || 0) + 1);
  }
  const projectedValues = [...projectedCounts.values()];
  const projectedMax = Math.max(...projectedValues);
  const projectedMin = Math.min(...projectedValues);
  const spreadPenalty = projectedMax - projectedMin;
  const mean = projectedValues.reduce((acc, v) => acc + v, 0) / projectedValues.length;
  const variancePenalty = projectedValues.reduce((acc, v) => {
    const diff = v - mean;
    return acc + diff * diff;
  }, 0);

  return {
    type,
    teamA,
    teamB,
    players,
    score:
      spreadPenalty * 100000 +
      variancePenalty * 10000 +
      playPenalty * 20 +
      partnerPenalty * 5 +
      oppPenalty * 3 +
      duplicatePenalty,
  };
}

function commitMatch(match: MatchCandidate, state: ScheduleState): void {
  for (const p of match.players) {
    state.playCount.set(p, (state.playCount.get(p) || 0) + 1);
  }
  const p1 = pairKey(match.teamA[0], match.teamA[1]);
  const p2 = pairKey(match.teamB[0], match.teamB[1]);
  state.partnerCount.set(p1, (state.partnerCount.get(p1) || 0) + 1);
  state.partnerCount.set(p2, (state.partnerCount.get(p2) || 0) + 1);
  for (const a of match.teamA) {
    for (const b of match.teamB) {
      const k = pairKey(a, b);
      state.oppCount.set(k, (state.oppCount.get(k) || 0) + 1);
    }
  }
  state.matchSet.add(`${match.type}:${p1}#${p2}`);
}

export function generateSchedule(input: ScheduleInput, seed: number): GeneratedSchedule {
  const rand = makeRng(seed);
  const males = buildPlayers("남", input.maleCount, input.maleNames);
  const females = buildPlayers("여", input.femaleCount, input.femaleNames);
  const slots = makeTimeSlots(input.startTime, input.endTime, input.matchMinutes);
  const totalMatches = slots.length * input.courtCount;

  const state: ScheduleState = {
    playCount: new Map(),
    partnerCount: new Map(),
    oppCount: new Map(),
    matchSet: new Set(),
  };

  [...males, ...females].forEach((p) => state.playCount.set(p, 0));

  const schedule: ScheduleMatch[] = [];
  for (const time of slots) {
    for (let court = 1; court <= input.courtCount; court += 1) {
      const candidates: MatchCandidate[] = [];
      const typeRotation = shuffledCopy(input.types, rand);
      for (const type of typeRotation) {
        for (let i = 0; i < 20; i += 1) {
          const match = makeMatch(type, males, females, state, rand);
          if (match) candidates.push(match);
        }
      }
      if (candidates.length === 0) {
        schedule.push({ time, court, empty: true });
        continue;
      }
      candidates.sort((a, b) => a.score - b.score);
      const winner = candidates[0];
      commitMatch(winner, state);
      schedule.push({
        time,
        court,
        type: winner.type,
        teamA: winner.teamA,
        teamB: winner.teamB,
      });
    }
  }

  const playCounts = [...state.playCount.values()];
  const maxPlay = Math.max(...playCounts);
  const minPlay = Math.min(...playCounts);
  const partnerByPlayer = new Map<string, Map<string, number>>();
  const opponentByPlayer = new Map<string, Map<string, number>>();
  const typeCountByPlayer = new Map<string, Record<MatchType, number>>();

  const emptyTypeCounts = (): Record<MatchType, number> => ({ MD: 0, WD: 0, MXD: 0 });

  for (const match of schedule) {
    if (match.empty || !match.teamA || !match.teamB || !match.type) continue;
    const [a1, a2] = match.teamA;
    const [b1, b2] = match.teamB;
    const players = [a1, a2, b1, b2];

    for (const player of players) {
      if (!typeCountByPlayer.has(player)) typeCountByPlayer.set(player, emptyTypeCounts());
      typeCountByPlayer.get(player)![match.type]++;
    }

    incrementNestedCount(partnerByPlayer, a1, a2);
    incrementNestedCount(partnerByPlayer, a2, a1);
    incrementNestedCount(partnerByPlayer, b1, b2);
    incrementNestedCount(partnerByPlayer, b2, b1);

    for (const a of [a1, a2]) {
      for (const b of [b1, b2]) {
        incrementNestedCount(opponentByPlayer, a, b);
        incrementNestedCount(opponentByPlayer, b, a);
      }
    }
  }

  const allPlayers = [...males, ...females];
  const playerStats: PlayerStat[] = allPlayers.map((player) => ({
    player,
    totalMatches: state.playCount.get(player) || 0,
    typeCounts: typeCountByPlayer.get(player) || emptyTypeCounts(),
    partners: Object.fromEntries([...(partnerByPlayer.get(player) || new Map())]),
    opponents: Object.fromEntries([...(opponentByPlayer.get(player) || new Map())]),
  }));

  return {
    slots,
    totalMatches,
    schedule,
    males,
    females,
    playStat: { minPlay, maxPlay },
    playerStats,
  };
}

export function validateInput(input: ScheduleInput): string | null {
  const { maleCount, femaleCount, courtCount, startTime, endTime, matchMinutes, types } = input;
  if (maleCount < 0 || femaleCount < 0) return "인원 수는 0 이상이어야 합니다.";
  if (courtCount < 1) return "코트 수는 1 이상이어야 합니다.";
  if (toMinute(endTime) <= toMinute(startTime)) return "종료시간은 시작시간보다 늦어야 합니다.";
  if (matchMinutes < 10) return "경기시간은 최소 10분이어야 합니다.";
  if (types.length === 0) return "최소 1개 경기 유형을 선택해주세요.";
  if (types.includes("MD") && maleCount < 4) return "남자복식을 위해 남성 4명 이상이 필요합니다.";
  if (types.includes("WD") && femaleCount < 4) return "여자복식을 위해 여성 4명 이상이 필요합니다.";
  if (types.includes("MXD") && (maleCount < 2 || femaleCount < 2))
    return "혼합복식을 위해 남성/여성 각 2명 이상이 필요합니다.";
  return null;
}

export function parseTypeLabel(type: MatchType): string {
  if (type === "MD") return "남복";
  if (type === "WD") return "여복";
  return "혼복";
}

export function isCurrentSlot(timeLabel: string, matchMinutes: number): boolean {
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const slotStart = toMinute(timeLabel);
  const slotEnd = slotStart + matchMinutes;
  return nowMinute >= slotStart && nowMinute < slotEnd;
}

export function matchToText(match: ScheduleMatch): string {
  if (match.empty) return "배정 실패";
  return `${match.teamA![0]} / ${match.teamA![1]} VS ${match.teamB![0]} / ${match.teamB![1]} (${parseTypeLabel(match.type!)})`;
}
