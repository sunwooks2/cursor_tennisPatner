import type { MatchType } from "./types";

export function typesNeedMale(types: MatchType[]): boolean {
  return types.includes("MD") || types.includes("MXD");
}

export function typesNeedFemale(types: MatchType[]): boolean {
  return types.includes("WD") || types.includes("MXD");
}
