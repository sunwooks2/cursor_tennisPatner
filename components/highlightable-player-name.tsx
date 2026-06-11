interface HighlightablePlayerNameProps {
  name: string;
  highlightedPlayer?: string | null;
}

export function HighlightablePlayerName({
  name,
  highlightedPlayer = null,
}: HighlightablePlayerNameProps) {
  if (highlightedPlayer && highlightedPlayer === name) {
    return (
      <span className="player-name-highlight rounded px-0.5 font-semibold text-[var(--primary-text)]">
        {name}
      </span>
    );
  }

  return <>{name}</>;
}
