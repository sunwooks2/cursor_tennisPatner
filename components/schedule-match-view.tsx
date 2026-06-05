import { matchToText } from "@/lib/schedule";
import type { ScheduleMatch } from "@/lib/types";

interface ScheduleMatchViewProps {
  match?: ScheduleMatch;
  inline?: boolean;
}

export function ScheduleMatchView({ match, inline = false }: ScheduleMatchViewProps) {
  if (!match || match.empty) {
    return <span className="text-sm text-[var(--muted)]">-</span>;
  }

  const text = matchToText(match);
  if (inline) {
    return <span className="text-[var(--text)]">{text}</span>;
  }

  return <p className="m-0 text-sm leading-snug text-[var(--text)]">{text}</p>;
}
