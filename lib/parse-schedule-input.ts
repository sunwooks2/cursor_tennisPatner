import { typesNeedFemale, typesNeedMale } from "./match-type-gender";
import type { MatchType, ScheduleInput, ScheduleMode, TeamRoster } from "./types";

export const DEFAULT_TEAM_A: TeamRoster = {
  name: "",
  maleCount: 0,
  femaleCount: 0,
  maleNames: [],
  femaleNames: [],
};

export const DEFAULT_TEAM_B: TeamRoster = {
  name: "",
  maleCount: 0,
  femaleCount: 0,
  maleNames: [],
  femaleNames: [],
};

export const DEFAULT_FREE_DOUBLES_COUNT = 4;
export const DEFAULT_TEAM_DOUBLES_PER_SIDE = 2;

export const DEFAULT_INPUT: ScheduleInput = {
  mode: "free",
  maleCount: 0,
  femaleCount: DEFAULT_FREE_DOUBLES_COUNT,
  maleNames: [],
  femaleNames: [],
  teamA: { ...DEFAULT_TEAM_A },
  teamB: { ...DEFAULT_TEAM_B },
  courtCount: 1,
  startTime: "09:00",
  endTime: "11:00",
  matchMinutes: 30,
  types: ["WD"],
};

export function resizeNames(names: string[], count: number): string[] {
  if (count <= names.length) return names.slice(0, count);
  return [...names, ...Array.from({ length: count - names.length }, () => "")];
}

export function applyTeamRosterDefaultsForTypes(
  teamA: TeamRoster,
  teamB: TeamRoster,
  types: MatchType[]
): { teamA: TeamRoster; teamB: TeamRoster } {
  const needMale = typesNeedMale(types);
  const needFemale = typesNeedFemale(types);
  let nextA = { ...teamA };
  let nextB = { ...teamB };

  if (!needMale) {
    nextA = { ...nextA, maleCount: 0, maleNames: [] };
    nextB = { ...nextB, maleCount: 0, maleNames: [] };
  } else if (nextA.maleCount === 0 && nextB.maleCount === 0) {
    nextA = {
      ...nextA,
      maleCount: DEFAULT_TEAM_DOUBLES_PER_SIDE,
      maleNames: resizeNames(nextA.maleNames, DEFAULT_TEAM_DOUBLES_PER_SIDE),
    };
    nextB = {
      ...nextB,
      maleCount: DEFAULT_TEAM_DOUBLES_PER_SIDE,
      maleNames: resizeNames(nextB.maleNames, DEFAULT_TEAM_DOUBLES_PER_SIDE),
    };
  }

  if (!needFemale) {
    nextA = { ...nextA, femaleCount: 0, femaleNames: [] };
    nextB = { ...nextB, femaleCount: 0, femaleNames: [] };
  } else if (nextA.femaleCount === 0 && nextB.femaleCount === 0) {
    nextA = {
      ...nextA,
      femaleCount: DEFAULT_TEAM_DOUBLES_PER_SIDE,
      femaleNames: resizeNames(nextA.femaleNames, DEFAULT_TEAM_DOUBLES_PER_SIDE),
    };
    nextB = {
      ...nextB,
      femaleCount: DEFAULT_TEAM_DOUBLES_PER_SIDE,
      femaleNames: resizeNames(nextB.femaleNames, DEFAULT_TEAM_DOUBLES_PER_SIDE),
    };
  }

  return { teamA: nextA, teamB: nextB };
}

function parseTeamRoster(prefix: string, params: URLSearchParams, defaultName: string): TeamRoster {
  const maleCount = Number(params.get(`${prefix}m`) ?? 0);
  const femaleCount = Number(params.get(`${prefix}f`) ?? 0);
  const name = params.get(`${prefix}n`)?.trim() || defaultName;
  let maleNames = params.get(`${prefix}mn`)?.split("|") ?? [];
  let femaleNames = params.get(`${prefix}fn`)?.split("|") ?? [];
  return {
    name,
    maleCount,
    femaleCount,
    maleNames: resizeNames(maleNames, maleCount),
    femaleNames: resizeNames(femaleNames, femaleCount),
  };
}

export function parseInputFromSearchParams(params: URLSearchParams): {
  input: ScheduleInput;
  seed: number;
} {
  const input: ScheduleInput = { ...DEFAULT_INPUT, teamA: { ...DEFAULT_TEAM_A }, teamB: { ...DEFAULT_TEAM_B } };
  const mode = (params.get("mode") ?? "free") as ScheduleMode;
  input.mode = mode === "team" ? "team" : "free";

  const c = params.get("c");
  const s = params.get("s");
  const e = params.get("e");
  const d = params.get("d");
  const t = params.get("t");
  const seedParam = params.get("seed");

  if (c) input.courtCount = Number(c);
  if (s) input.startTime = s;
  if (e) input.endTime = e;
  if (d) input.matchMinutes = Number(d);
  if (t) input.types = t.split(",").filter(Boolean) as MatchType[];

  if (input.mode === "team") {
    input.teamA = parseTeamRoster("ta", params, "");
    input.teamB = parseTeamRoster("tb", params, "");
    const teamDefaults = applyTeamRosterDefaultsForTypes(input.teamA, input.teamB, input.types);
    input.teamA = teamDefaults.teamA;
    input.teamB = teamDefaults.teamB;
  } else {
    const m = params.get("m");
    const f = params.get("f");
    if (m) input.maleCount = Number(m);
    if (f) input.femaleCount = Number(f);
    const mn = params.get("mn");
    const fn = params.get("fn");
    if (mn) input.maleNames = mn.split("|");
    if (fn) input.femaleNames = fn.split("|");
    input.maleNames = resizeNames(input.maleNames, input.maleCount);
    input.femaleNames = resizeNames(input.femaleNames, input.femaleCount);
  }

  const seed = seedParam ? Number(seedParam) : Date.now();
  return { input, seed };
}

export function formatTeamSummary(
  teamAName: string,
  teamBName: string,
  teamAMaleCount: number,
  teamAFemaleCount: number,
  teamBMaleCount: number,
  teamBFemaleCount: number,
  matchCount: number,
  teamATotalMatches: number,
  teamBTotalMatches: number
): string {
  return `${teamAName} (남${teamAMaleCount} 여${teamAFemaleCount}) VS ${teamBName} (남${teamBMaleCount} 여${teamBFemaleCount}) · 총 ${matchCount}경기 · 팀 출전 ${teamAName} ${teamATotalMatches} / ${teamBName} ${teamBTotalMatches}`;
}
