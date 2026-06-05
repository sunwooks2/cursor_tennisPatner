export function getFilterChipClass(active: boolean): string {
  return active
    ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
    : "border-[var(--line)] bg-white text-[var(--muted)]";
}
