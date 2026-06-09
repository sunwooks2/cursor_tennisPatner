import type { MatchType } from "./types";

export function getFilterChipClass(active: boolean): string {
  return active
    ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
    : "border-[var(--line)] bg-white text-[var(--muted)]";
}

export function getMatchTypeBadgeClass(type: MatchType): string {
  switch (type) {
    case "MD":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "WD":
      return "bg-[#fce7f3] text-[#be185d]";
    case "MXD":
      return "bg-[var(--primary-soft)] text-[var(--primary-text)]";
  }
}
