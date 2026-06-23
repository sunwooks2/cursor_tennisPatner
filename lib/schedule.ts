import {
  buildPlayers,
  computeTypeBalancePenalty,
  createSlotBusy,
  emptyTypeCounts,
  excludeBusyPlayers,
  incrementNestedCount,
  isMatchSlotAvailable,
  makeRng,
  makeTimeSlots,
  occupySlotPlayers,
  pairKey,
  parseTypeLabel,
  SCHEDULE_CANDIDATE_ATTEMPTS,
  shuffledCopy,
  toMinute,
  TYPE_BALANCE_PENALTY_WEIGHT,
  type RandFn,
  type TypeCountRecord,
} from "./schedule-common";
import { typesNeedFemale, typesNeedMale } from "./match-type-gender";
import { generateTeamSchedule, validateTeamInput } from "./schedule-team";
import { formatTeamMatchText } from "./team-stats";
import type {
  GeneratedSchedule,
  MatchType,
  PlayerStat,
  ScheduleInput,
  ScheduleMatch,
  TeamScheduleInfo,
} from "./types";

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
  typeCountByPlayer: Map<string, TypeCountRecord>;
  matchSet: Set<string>;
}

function makeMatch(
  type: MatchType,
  males: string[],
  females: string[],
  state: ScheduleState,
  rand: RandFn,
  slotBusy: ReadonlySet<string>,
  activeTypes: readonly MatchType[]
): MatchCandidate | null {
  const needed =
    type === "MD" ? (["M", "M", "M", "M"] as const) : type === "WD" ? (["F", "F", "F", "F"] as const) : (["M", "M", "F", "F"] as const);
  const malePool = shuffledCopy(excludeBusyPlayers(males, slotBusy), rand);
  const femalePool = shuffledCopy(excludeBusyPlayers(females, slotBusy), rand);
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
  const typeBalancePenalty = computeTypeBalancePenalty(
    players,
    type,
    state.typeCountByPlayer,
    activeTypes,
    males
  );

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
      typeBalancePenalty * TYPE_BALANCE_PENALTY_WEIGHT +
      oppPenalty * 3 +
      duplicatePenalty,
  };
}

function commitMatch(match: MatchCandidate, state: ScheduleState): void {
  for (const p of match.players) {
    state.playCount.set(p, (state.playCount.get(p) || 0) + 1);
    if (!state.typeCountByPlayer.has(p)) {
      state.typeCountByPlayer.set(p, emptyTypeCounts());
    }
    state.typeCountByPlayer.get(p)![match.type]++;
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

export function generateFreeSchedule(input: ScheduleInput, seed: number): GeneratedSchedule {
  const rand = makeRng(seed);
  const males = typesNeedMale(input.types)
    ? buildPlayers("남", input.maleCount, input.maleNames)
    : [];
  const females = typesNeedFemale(input.types)
    ? buildPlayers("여", input.femaleCount, input.femaleNames)
    : [];
  const slots = makeTimeSlots(input.startTime, input.endTime, input.matchMinutes);
  const totalMatches = slots.length * input.courtCount;

  const state: ScheduleState = {
    playCount: new Map(),
    partnerCount: new Map(),
    oppCount: new Map(),
    typeCountByPlayer: new Map(),
    matchSet: new Set(),
  };

  [...males, ...females].forEach((p) => {
    state.playCount.set(p, 0);
    state.typeCountByPlayer.set(p, emptyTypeCounts());
  });

  const schedule: ScheduleMatch[] = [];
  const enforceSlotUnique = input.courtCount >= 2;

  for (const time of slots) {
    const slotBusy = enforceSlotUnique ? createSlotBusy() : null;

    for (let court = 1; court <= input.courtCount; court += 1) {
      const candidates: MatchCandidate[] = [];
      const typeRotation = shuffledCopy(input.types, rand);
      const slotBusyForMatch = slotBusy ?? new Set<string>();
      for (const type of typeRotation) {
        for (let i = 0; i < SCHEDULE_CANDIDATE_ATTEMPTS; i += 1) {
          const match = makeMatch(type, males, females, state, rand, slotBusyForMatch, input.types);
          if (match && isMatchSlotAvailable(match.players, slotBusyForMatch)) {
            candidates.push(match);
          }
        }
      }
      if (candidates.length === 0) {
        schedule.push({ time, court, empty: true });
        continue;
      }
      candidates.sort((a, b) => a.score - b.score);
      const winner = candidates[0];
      commitMatch(winner, state);
      if (slotBusy) occupySlotPlayers(slotBusy, winner.players);
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

  for (const match of schedule) {
    if (match.empty || !match.teamA || !match.teamB || !match.type) continue;
    const [a1, a2] = match.teamA;
    const [b1, b2] = match.teamB;

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
    typeCounts: state.typeCountByPlayer.get(player) || emptyTypeCounts(),
    partners: Object.fromEntries([...(partnerByPlayer.get(player) || new Map())]),
    opponents: Object.fromEntries([...(opponentByPlayer.get(player) || new Map())]),
  }));

  return {
    mode: "free",
    slots,
    totalMatches,
    schedule,
    males,
    females,
    playStat: { minPlay, maxPlay },
    playerStats,
  };
}

export function generateSchedule(input: ScheduleInput, seed: number): GeneratedSchedule {
  if (input.mode === "team") return generateTeamSchedule(input, seed);
  return generateFreeSchedule(input, seed);
}

export function validateInput(input: ScheduleInput): string | null {
  if (input.mode === "team") return validateTeamInput(input);

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

export { parseTypeLabel };

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

export function formatMatchText(match: ScheduleMatch, teamInfo?: TeamScheduleInfo): string {
  if (teamInfo) return formatTeamMatchText(match, teamInfo);
  return matchToText(match);
}
