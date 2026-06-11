interface HighlightablePlayerNameProps {
  name: string;
  highlightedPlayer?: string | null;
  highlightKey?: string;
}

export function HighlightablePlayerName({
  name,
  highlightedPlayer = null,
  highlightKey,
}: HighlightablePlayerNameProps) {
  const key = highlightKey ?? name;
  if (highlightedPlayer && highlightedPlayer === key) {
    return (
      <span className="player-name-highlight rounded px-0.5 font-semibold text-[var(--primary-text)]">
        {name}
      </span>
    );
  }

  return <>{name}</>;
}
