import { buildPlayers, makeTimeSlots, toMinute } from "@/lib/schedule-common";
import { typesNeedFemale, typesNeedMale } from "@/lib/match-type-gender";
import {
  computePlayerStatsFromSchedule,
  computePlayStatFromSchedule,
} from "@/lib/compute-player-stats";
import { getBusyPlayersAtTime, getMatchPlayers, isPlayableMatch } from "@/lib/match-utils";
import { buildTeamPlayers } from "@/lib/team-stats";
import type {
  GeneratedSchedule,
  ManualLayout,
  MatchType,
  ScheduleInput,
  ScheduleMatch,
  TeamScheduleInfo,
} from "@/lib/types";

function buildRosterPlayers(input: ScheduleInput, layout: ManualLayout) {
  if (layout === "team") {
    const teamAMales = typesNeedMale(input.types)
      ? buildTeamPlayers(input.teamA.name, "남", input.teamA.maleCount, input.teamA.maleNames)
      : [];
    const teamAFemales = typesNeedFemale(input.types)
      ? buildTeamPlayers(input.teamA.name, "여", input.teamA.femaleCount, input.teamA.femaleNames)
      : [];
    const teamBMales = typesNeedMale(input.types)
      ? buildTeamPlayers(input.teamB.name, "남", input.teamB.maleCount, input.teamB.maleNames)
      : [];
    const teamBFemales = typesNeedFemale(input.types)
      ? buildTeamPlayers(input.teamB.name, "여", input.teamB.femaleCount, input.teamB.femaleNames)
      : [];

    const teamInfo: TeamScheduleInfo = {
      teamAName: input.teamA.name.trim(),
      teamBName: input.teamB.name.trim(),
      teamAMales,
      teamAFemales,
      teamBMales,
      teamBFemales,
      teamATotalMatches: 0,
      teamBTotalMatches: 0,
    };

    return {
      males: [...teamAMales, ...teamBMales],
      females: [...teamAFemales, ...teamBFemales],
      allPlayers: [...teamAMales, ...teamAFemales, ...teamBMales, ...teamBFemales],
      teamInfo,
    };
  }

  const males = typesNeedMale(input.types)
    ? buildPlayers("남", input.maleCount, input.maleNames)
    : [];
  const females = typesNeedFemale(input.types)
    ? buildPlayers("여", input.femaleCount, input.femaleNames)
    : [];

  return {
    males,
    females,
    allPlayers: [...males, ...females],
    teamInfo: undefined,
  };
}

function emptyGrid(input: ScheduleInput): ScheduleMatch[] {
  const slots = makeTimeSlots(input.startTime, input.endTime, input.matchMinutes);
  const schedule: ScheduleMatch[] = [];
  for (const time of slots) {
    for (let court = 1; court <= input.courtCount; court += 1) {
      schedule.push({ time, court, pending: true });
    }
  }
  return schedule;
}

function refreshTeamTotals(schedule: ScheduleMatch[], teamInfo?: TeamScheduleInfo): TeamScheduleInfo | undefined {
  if (!teamInfo) return undefined;

  const teamAPlayers = new Set([...teamInfo.teamAMales, ...teamInfo.teamAFemales]);
  const teamBPlayers = new Set([...teamInfo.teamBMales, ...teamInfo.teamBFemales]);
  let teamATotalMatches = 0;
  let teamBTotalMatches = 0;

  for (const match of schedule) {
    if (!isPlayableMatch(match)) continue;
    for (const player of [match.teamA![0], match.teamA![1]]) {
      if (teamAPlayers.has(player)) teamATotalMatches += 1;
    }
    for (const player of [match.teamB![0], match.teamB![1]]) {
      if (teamBPlayers.has(player)) teamBTotalMatches += 1;
    }
  }

  return { ...teamInfo, teamATotalMatches, teamBTotalMatches };
}

export function resolveManualLayout(input: ScheduleInput): ManualLayout {
  return input.manualLayout ?? "free";
}

export function isTeamStyleSchedule(generated: GeneratedSchedule): boolean {
  return generated.mode === "team" || (generated.mode === "manual" && Boolean(generated.teamInfo));
}

export function validateManualInput(input: ScheduleInput): string | null {
  const layout = resolveManualLayout(input);
  const { courtCount, startTime, endTime, matchMinutes, types } = input;

  if (courtCount < 1) return "코트 수는 1 이상이어야 합니다.";
  if (toMinute(endTime) <= toMinute(startTime)) return "종료시간은 시작시간보다 늦어야 합니다.";
  if (matchMinutes < 10) return "경기시간은 최소 10분이어야 합니다.";
  if (types.length === 0) return "최소 1개 경기 유형을 선택해주세요.";

  if (layout === "team") {
    if (!input.teamA.name.trim() || !input.teamB.name.trim()) return "팀 이름을 입력해주세요.";
    const totalA = input.teamA.maleCount + input.teamA.femaleCount;
    const totalB = input.teamB.maleCount + input.teamB.femaleCount;
    if (totalA < 1 || totalB < 1) return "각 팀에 최소 1명 이상 필요합니다.";
    if (types.includes("MD") && (input.teamA.maleCount < 1 || input.teamB.maleCount < 1)) {
      return "남자복식을 위해 팀당 남성 1명 이상이 필요합니다.";
    }
    if (types.includes("WD") && (input.teamA.femaleCount < 1 || input.teamB.femaleCount < 1)) {
      return "여자복식을 위해 팀당 여성 1명 이상이 필요합니다.";
    }
    if (
      types.includes("MXD") &&
      (input.teamA.maleCount < 1 ||
        input.teamA.femaleCount < 1 ||
        input.teamB.maleCount < 1 ||
        input.teamB.femaleCount < 1)
    ) {
      return "혼합복식을 위해 팀당 남·여 각 1명 이상이 필요합니다.";
    }
    return null;
  }

  const { maleCount, femaleCount } = input;
  if (maleCount < 0 || femaleCount < 0) return "인원 수는 0 이상이어야 합니다.";
  if (maleCount + femaleCount < 2) return "최소 2명 이상 필요합니다.";
  if (types.includes("MD") && maleCount < 2) return "남자복식을 위해 남성 2명 이상이 필요합니다.";
  if (types.includes("WD") && femaleCount < 2) return "여자복식을 위해 여성 2명 이상이 필요합니다.";
  if (types.includes("MXD") && (maleCount < 1 || femaleCount < 1)) {
    return "혼합복식을 위해 남성·여성 각 1명 이상이 필요합니다.";
  }
  return null;
}

export function generateManualSchedule(input: ScheduleInput): GeneratedSchedule {
  const layout = resolveManualLayout(input);
  const slots = makeTimeSlots(input.startTime, input.endTime, input.matchMinutes);
  const schedule = emptyGrid(input);
  const roster = buildRosterPlayers(input, layout);
  const teamInfo = refreshTeamTotals(schedule, roster.teamInfo);

  return {
    mode: "manual",
    manualLayout: layout,
    slots,
    totalMatches: schedule.length,
    schedule,
    males: roster.males,
    females: roster.females,
    playStat: computePlayStatFromSchedule(schedule, roster.allPlayers),
    playerStats: computePlayerStatsFromSchedule(schedule, roster.allPlayers),
    teamInfo,
  };
}

export function rebuildManualGenerated(
  generated: GeneratedSchedule,
  schedule: ScheduleMatch[],
  input: ScheduleInput
): GeneratedSchedule {
  const layout = generated.manualLayout ?? resolveManualLayout(input);
  const roster = buildRosterPlayers(input, layout);
  const teamInfo = refreshTeamTotals(schedule, roster.teamInfo);

  return {
    ...generated,
    schedule,
    playStat: computePlayStatFromSchedule(schedule, roster.allPlayers),
    playerStats: computePlayerStatsFromSchedule(schedule, roster.allPlayers),
    teamInfo,
  };
}

export function validateManualMatchAssignment(
  schedule: ScheduleMatch[],
  time: string,
  court: number,
  type: MatchType,
  teamA: [string, string],
  teamB: [string, string],
  males: string[]
): string | null {
  if (teamA[0] === teamA[1] || teamB[0] === teamB[1]) {
    return "같은 선수를 한 팀에 두 번 넣을 수 없습니다.";
  }

  const players = [teamA[0], teamA[1], teamB[0], teamB[1]];
  if (new Set(players).size !== 4) {
    return "4명의 서로 다른 선수를 선택해주세요.";
  }

  const busy = getBusyPlayersAtTime(schedule, time);
  for (const match of schedule) {
    if (match.time !== time || match.court === court) continue;
    for (const player of getMatchPlayers(match)) {
      busy.add(player);
    }
  }

  for (const player of players) {
    if (busy.has(player)) {
      return `${player} 선수는 같은 시간에 다른 코트에 이미 배정되어 있습니다.`;
    }
  }

  if (type === "MD") {
    if (players.some((player) => !males.includes(player))) {
      return "남자복식은 남성 4명이 필요합니다.";
    }
  }
  if (type === "WD") {
    if (players.some((player) => males.includes(player))) {
      return "여자복식은 여성 4명이 필요합니다.";
    }
  }
  if (type === "MXD") {
    const maleCount = players.filter((player) => males.includes(player)).length;
    if (maleCount !== 2) return "혼합복식은 남성 2명, 여성 2명이 필요합니다.";
  }

  return null;
}

export function serializeManualSchedule(schedule: ScheduleMatch[]): string {
  return JSON.stringify(schedule);
}

export function parseManualSchedule(value: unknown): ScheduleMatch[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: ScheduleMatch[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as ScheduleMatch;
    if (typeof row.time !== "string" || typeof row.court !== "number") return null;
    parsed.push({
      time: row.time,
      court: row.court,
      empty: row.empty,
      pending: row.pending,
      type: row.type,
      teamA: row.teamA,
      teamB: row.teamB,
    });
  }
  return parsed;
}
