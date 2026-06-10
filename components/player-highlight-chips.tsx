interface PlayerHighlightChipsProps {
  players: string[];
  selectedPlayer: string | null;
  onSelect: (player: string | null) => void;
}

export function PlayerHighlightChips({ players, selectedPlayer, onSelect }: PlayerHighlightChipsProps) {
  if (!players.length) return null;

  return (
    <div className="export-exclude mb-3">
      <p className="mb-1.5 text-xs font-semibold text-[var(--muted)]">
        내 경기 보기
        {selectedPlayer && <span className="font-normal"> · 경기 없는 시간은 휴식 타임으로 표시</span>}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-full border px-3 py-1.5 text-[0.86rem] ${
            selectedPlayer === null
              ? "border-[var(--primary-border)] bg-[var(--primary-soft)] font-semibold text-[var(--primary-text)]"
              : "border-[var(--line)] bg-white text-[var(--text)]"
          }`}
        >
          전체
        </button>
        {players.map((player) => (
          <button
            key={player}
            type="button"
            onClick={() => onSelect(selectedPlayer === player ? null : player)}
            className={`max-w-[9rem] truncate rounded-full border px-3 py-1.5 text-[0.86rem] ${
              selectedPlayer === player
                ? "border-[var(--primary-border)] bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]"
                : "border-[var(--line)] bg-white text-[var(--text)]"
            }`}
            title={player}
          >
            {player}
          </button>
        ))}
      </div>
    </div>
  );
}
