import { buildPlayers } from "@/lib/schedule-common";
import { resizeNames } from "@/lib/parse-schedule-input";
import {
  getTeamFemalePrefix,
  getTeamMalePrefix,
  stripTeamPrefixFromPlayerName,
} from "@/lib/team-stats";
import { typesNeedFemale, typesNeedMale } from "@/lib/match-type-gender";
import type { ManualLayout, ScheduleInput, TeamRoster } from "@/lib/types";

export interface EventRoster {
  mode: "free" | "team";
  manualLayout?: ManualLayout;
  maleNames?: string[];
  femaleNames?: string[];
  teamA?: Pick<TeamRoster, "name" | "maleNames" | "femaleNames">;
  teamB?: Pick<TeamRoster, "name" | "maleNames" | "femaleNames">;
}

export interface RegistrationField {
  id: string;
  label: string;
  value: string;
}

function mergeTeamRosterNames(
  target: TeamRoster,
  source: Pick<TeamRoster, "name" | "maleNames" | "femaleNames"> | undefined
): TeamRoster {
  if (!source) return target;

  const maleCount = source.maleNames?.length
    ? Math.max(target.maleCount, source.maleNames.length)
    : target.maleCount;
  const femaleCount = source.femaleNames?.length
    ? Math.max(target.femaleCount, source.femaleNames.length)
    : target.femaleCount;

  return {
    ...target,
    name: source.name?.trim() ? source.name.trim() : target.name,
    maleCount,
    femaleCount,
    maleNames: source.maleNames
      ? resizeNames(source.maleNames, maleCount)
      : target.maleNames,
    femaleNames: source.femaleNames
      ? resizeNames(source.femaleNames, femaleCount)
      : target.femaleNames,
  };
}

export function rosterFromInput(input: ScheduleInput): EventRoster {
  const layout = input.mode === "manual" ? input.manualLayout : input.mode;

  if (layout === "team") {
    return {
      mode: "team",
      manualLayout: input.mode === "manual" ? input.manualLayout : undefined,
      teamA: {
        name: input.teamA.name,
        maleNames: input.teamA.maleNames.map((name) =>
          stripTeamPrefixFromPlayerName(input.teamA.name, name)
        ),
        femaleNames: input.teamA.femaleNames.map((name) =>
          stripTeamPrefixFromPlayerName(input.teamA.name, name)
        ),
      },
      teamB: {
        name: input.teamB.name,
        maleNames: input.teamB.maleNames.map((name) =>
          stripTeamPrefixFromPlayerName(input.teamB.name, name)
        ),
        femaleNames: input.teamB.femaleNames.map((name) =>
          stripTeamPrefixFromPlayerName(input.teamB.name, name)
        ),
      },
    };
  }

  return {
    mode: "free",
    manualLayout: input.mode === "manual" ? input.manualLayout : undefined,
    maleNames: [...input.maleNames],
    femaleNames: [...input.femaleNames],
  };
}

export function mergeRosterIntoInput(input: ScheduleInput, roster: EventRoster | null): ScheduleInput {
  if (!roster) return input;

  const inputLayout: ManualLayout = input.mode === "manual" ? input.manualLayout : input.mode;
  if (roster.mode !== inputLayout) return input;

  if (roster.mode === "team") {
    return {
      ...input,
      teamA: mergeTeamRosterNames(input.teamA, roster.teamA),
      teamB: mergeTeamRosterNames(input.teamB, roster.teamB),
    };
  }

  const maleCount = roster.maleNames?.length
    ? Math.max(input.maleCount, roster.maleNames.length)
    : input.maleCount;
  const femaleCount = roster.femaleNames?.length
    ? Math.max(input.femaleCount, roster.femaleNames.length)
    : input.femaleCount;

  return {
    ...input,
    maleCount,
    femaleCount,
    maleNames: roster.maleNames
      ? resizeNames(roster.maleNames, maleCount)
      : input.maleNames,
    femaleNames: roster.femaleNames
      ? resizeNames(roster.femaleNames, femaleCount)
      : input.femaleNames,
  };
}

function teamRegistrationFields(
  sideKey: "teamA" | "teamB",
  roster: TeamRoster,
  types: ScheduleInput["types"]
): RegistrationField[] {
  const fields: RegistrationField[] = [];
  const teamName = roster.name.trim();
  const malePrefix = getTeamMalePrefix(teamName);
  const femalePrefix = getTeamFemalePrefix(teamName);

  if (typesNeedMale(types) && roster.maleCount > 0) {
    const slotLabels = buildPlayers(malePrefix, roster.maleCount);
    slotLabels.forEach((slotLabel, index) => {
      fields.push({
        id: `${sideKey}-m-${index}`,
        label: slotLabel,
        value: stripTeamPrefixFromPlayerName(teamName, roster.maleNames[index] ?? ""),
      });
    });
  }

  if (typesNeedFemale(types) && roster.femaleCount > 0) {
    const slotLabels = buildPlayers(femalePrefix, roster.femaleCount);
    slotLabels.forEach((slotLabel, index) => {
      fields.push({
        id: `${sideKey}-f-${index}`,
        label: slotLabel,
        value: stripTeamPrefixFromPlayerName(teamName, roster.femaleNames[index] ?? ""),
      });
    });
  }

  return fields;
}

export function buildRegistrationFields(input: ScheduleInput): RegistrationField[] {
  const layout = input.mode === "manual" ? input.manualLayout : input.mode;

  if (layout === "team") {
    return [
      ...teamRegistrationFields("teamA", input.teamA, input.types),
      ...teamRegistrationFields("teamB", input.teamB, input.types),
    ];
  }

  const fields: RegistrationField[] = [];

  if (input.maleCount > 0) {
    const slotLabels = buildPlayers("남", input.maleCount);
    slotLabels.forEach((slotLabel, index) => {
      fields.push({
        id: `free-m-${index}`,
        label: slotLabel,
        value: input.maleNames[index]?.trim() ?? "",
      });
    });
  }

  if (input.femaleCount > 0) {
    const slotLabels = buildPlayers("여", input.femaleCount);
    slotLabels.forEach((slotLabel, index) => {
      fields.push({
        id: `free-f-${index}`,
        label: slotLabel,
        value: input.femaleNames[index]?.trim() ?? "",
      });
    });
  }

  return fields;
}

export function applyRegistrationFields(
  input: ScheduleInput,
  fields: RegistrationField[]
): ScheduleInput {
  const valueById = new Map(fields.map((field) => [field.id, field.value.trim()]));

  const layout = input.mode === "manual" ? input.manualLayout : input.mode;

  if (layout === "team") {
    const applySide = (sideKey: "teamA" | "teamB", roster: TeamRoster): TeamRoster => {
      const maleNames = [...roster.maleNames];
      const femaleNames = [...roster.femaleNames];

      for (let index = 0; index < roster.maleCount; index += 1) {
        const value = valueById.get(`${sideKey}-m-${index}`) ?? "";
        maleNames[index] = value;
      }
      for (let index = 0; index < roster.femaleCount; index += 1) {
        const value = valueById.get(`${sideKey}-f-${index}`) ?? "";
        femaleNames[index] = value;
      }

      return {
        ...roster,
        maleNames: resizeNames(maleNames, roster.maleCount),
        femaleNames: resizeNames(femaleNames, roster.femaleCount),
      };
    };

    return {
      ...input,
      teamA: applySide("teamA", input.teamA),
      teamB: applySide("teamB", input.teamB),
    };
  }

  const maleNames = [...input.maleNames];
  const femaleNames = [...input.femaleNames];

  for (let index = 0; index < input.maleCount; index += 1) {
    maleNames[index] = valueById.get(`free-m-${index}`) ?? "";
  }
  for (let index = 0; index < input.femaleCount; index += 1) {
    femaleNames[index] = valueById.get(`free-f-${index}`) ?? "";
  }

  return {
    ...input,
    maleNames: resizeNames(maleNames, input.maleCount),
    femaleNames: resizeNames(femaleNames, input.femaleCount),
  };
}

export function normalizeEventRoster(value: unknown): EventRoster | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as EventRoster;
  if (raw.mode !== "free" && raw.mode !== "team") return null;

  if (raw.mode === "free") {
    return {
      mode: "free",
      maleNames: Array.isArray(raw.maleNames)
        ? raw.maleNames.map((name) => String(name ?? ""))
        : [],
      femaleNames: Array.isArray(raw.femaleNames)
        ? raw.femaleNames.map((name) => String(name ?? ""))
        : [],
    };
  }

  const normalizeSide = (side: EventRoster["teamA"]) => {
    if (!side || typeof side !== "object") return undefined;
    return {
      name: typeof side.name === "string" ? side.name : "",
      maleNames: Array.isArray(side.maleNames)
        ? side.maleNames.map((name) => String(name ?? ""))
        : [],
      femaleNames: Array.isArray(side.femaleNames)
        ? side.femaleNames.map((name) => String(name ?? ""))
        : [],
    };
  };

  return {
    mode: "team",
    teamA: normalizeSide(raw.teamA),
    teamB: normalizeSide(raw.teamB),
  };
}
