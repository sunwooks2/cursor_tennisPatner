import {
  buildPlayers,
  incrementNestedCount,
  makeRng,
  makeTimeSlots,
  pairKey,
  shuffledCopy,
  type RandFn,
} from "./schedule-common";
import { getTeamFemalePrefix, getTeamMalePrefix } from "./team-stats";
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
  matchSet: Set<string>;
}

function pickDistinct(pool: string[], count: number): string[] | null {
  if (pool.length < count) return null;
  const picked: string[] = [];
  for (const name of pool) {
    if (picked.includes(name)) continue;
    picked.push(name);
    if (picked.length === count) return picked;
  }
  return null;
}

function makeTeamMatch(
  type: MatchType,
  teamAMales: string[],
  teamAFemales: string[],
  teamBMales: string[],
  teamBFemales: string[],
  state: ScheduleState,
  rand: RandFn
): MatchCandidate | null {
  let teamA: [string, string];
  let teamB: [string, string];

  if (type === "MD") {
    const aMales = pickDistinct(shuffledCopy(teamAMales, rand), 2);
    const bMales = pickDistinct(shuffledCopy(teamBMales, rand), 2);
    if (!aMales || !bMales) return null;
    teamA = [aMales[0], aMales[1]];
    teamB = [bMales[0], bMales[1]];
  } else if (type === "WD") {
    const aFemales = pickDistinct(shuffledCopy(teamAFemales, rand), 2);
    const bFemales = pickDistinct(shuffledCopy(teamBFemales, rand), 2);
    if (!aFemales || !bFemales) return null;
    teamA = [aFemales[0], aFemales[1]];
    teamB = [bFemales[0], bFemales[1]];
  } else {
    const aMales = shuffledCopy(teamAMales, rand);
    const aFemales = shuffledCopy(teamAFemales, rand);
    const bMales = shuffledCopy(teamBMales, rand);
    const bFemales = shuffledCopy(teamBFemales, rand);
    if (!aMales[0] || !aFemales[0] || !bMales[0] || !bFemales[0]) return null;
    teamA = [aMales[0], aFemales[0]];
    teamB = [bMales[0], bFemales[0]];
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

export function validateTeamInput(input: ScheduleInput): string | null {
  const { teamA, teamB, courtCount, startTime, endTime, matchMinutes, types } = input;
  if (!teamA.name.trim() || !teamB.name.trim()) return "팀 이름을 입력해주세요.";
  if (teamA.name.trim().length > 20 || teamB.name.trim().length > 20) return "팀 이름은 20자 이하여야 합니다.";
  if (teamA.maleCount < 0 || teamA.femaleCount < 0 || teamB.maleCount < 0 || teamB.femaleCount < 0) {
    return "인원 수는 0 이상이어야 합니다.";
  }
  const totalA = teamA.maleCount + teamA.femaleCount;
  const totalB = teamB.maleCount + teamB.femaleCount;
  if (totalA < 1 || totalB < 1) return "각 팀에 최소 1명 이상 필요합니다.";
  if (courtCount < 1) return "코트 수는 1 이상이어야 합니다.";
  if (toMinute(endTime) <= toMinute(startTime)) return "종료시간은 시작시간보다 늦어야 합니다.";
  if (matchMinutes < 10) return "경기시간은 최소 10분이어야 합니다.";
  if (types.length === 0) return "최소 1개 경기 유형을 선택해주세요.";
  if (types.includes("MD") && (teamA.maleCount < 2 || teamB.maleCount < 2)) {
    return "남자복식은 팀당 남성 2명 이상이 필요합니다.";
  }
  if (types.includes("WD") && (teamA.femaleCount < 2 || teamB.femaleCount < 2)) {
    return "여자복식은 팀당 여성 2명 이상이 필요합니다.";
  }
  if (
    types.includes("MXD") &&
    (teamA.maleCount < 1 || teamA.femaleCount < 1 || teamB.maleCount < 1 || teamB.femaleCount < 1)
  ) {
    return "혼합복식은 팀당 남·여 각 1명 이상이 필요합니다.";
  }
  return null;
}

function toMinute(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function generateTeamSchedule(input: ScheduleInput, seed: number): GeneratedSchedule {
  const rand = makeRng(seed);
  const teamAMales = buildPlayers(
    getTeamMalePrefix(input.teamA.name),
    input.teamA.maleCount,
    input.teamA.maleNames
  );
  const teamAFemales = buildPlayers(
    getTeamFemalePrefix(input.teamA.name),
    input.teamA.femaleCount,
    input.teamA.femaleNames
  );
  const teamBMales = buildPlayers(
    getTeamMalePrefix(input.teamB.name),
    input.teamB.maleCount,
    input.teamB.maleNames
  );
  const teamBFemales = buildPlayers(
    getTeamFemalePrefix(input.teamB.name),
    input.teamB.femaleCount,
    input.teamB.femaleNames
  );
  const slots = makeTimeSlots(input.startTime, input.endTime, input.matchMinutes);
  const totalMatches = slots.length * input.courtCount;

  const allPlayers = [...teamAMales, ...teamAFemales, ...teamBMales, ...teamBFemales];
  const state: ScheduleState = {
    playCount: new Map(),
    partnerCount: new Map(),
    oppCount: new Map(),
    matchSet: new Set(),
  };
  allPlayers.forEach((p) => state.playCount.set(p, 0));

  const schedule: ScheduleMatch[] = [];
  for (const time of slots) {
    for (let court = 1; court <= input.courtCount; court += 1) {
      const candidates: MatchCandidate[] = [];
      const typeRotation = shuffledCopy(input.types, rand);
      for (const type of typeRotation) {
        for (let i = 0; i < 20; i += 1) {
          const match = makeTeamMatch(
            type,
            teamAMales,
            teamAFemales,
            teamBMales,
            teamBFemales,
            state,
            rand
          );
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

  const playerStats: PlayerStat[] = allPlayers.map((player) => ({
    player,
    totalMatches: state.playCount.get(player) || 0,
    typeCounts: typeCountByPlayer.get(player) || emptyTypeCounts(),
    partners: Object.fromEntries([...(partnerByPlayer.get(player) || new Map())]),
    opponents: Object.fromEntries([...(opponentByPlayer.get(player) || new Map())]),
  }));

  const teamAPlayers = new Set([...teamAMales, ...teamAFemales]);
  const teamBPlayers = new Set([...teamBMales, ...teamBFemales]);
  let teamATotalMatches = 0;
  let teamBTotalMatches = 0;
  for (const [player, count] of state.playCount) {
    if (teamAPlayers.has(player)) teamATotalMatches += count;
    if (teamBPlayers.has(player)) teamBTotalMatches += count;
  }

  const teamInfo: TeamScheduleInfo = {
    teamAName: input.teamA.name.trim(),
    teamBName: input.teamB.name.trim(),
    teamAMales,
    teamAFemales,
    teamBMales,
    teamBFemales,
    teamATotalMatches,
    teamBTotalMatches,
  };

  return {
    mode: "team",
    slots,
    totalMatches,
    schedule,
    males: [...teamAMales, ...teamBMales],
    females: [...teamAFemales, ...teamBFemales],
    playStat: { minPlay, maxPlay },
    playerStats,
    teamInfo,
  };
}
