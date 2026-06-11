const NAME_INPUT_GRID_CLASS = "grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-4";

type PlayerNameInputRowProps = {
  genderLabel: "남자" | "여자";
  count: number;
  names: string[];
  placeholderPrefix: string;
  keyPrefix: string;
  onNameChange: (index: number, value: string) => void;
  className?: string;
};

export function PlayerNameInputRow({
  genderLabel,
  count,
  names,
  placeholderPrefix,
  keyPrefix,
  onNameChange,
  className = "",
}: PlayerNameInputRowProps) {
  if (count <= 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span className="name-input-row-label shrink-0">{genderLabel}</span>
      <div className={NAME_INPUT_GRID_CLASS}>
        {Array.from({ length: count }, (_, i) => (
          <input
            key={`${keyPrefix}-${i}`}
            type="text"
            value={names[i] ?? ""}
            placeholder={`${placeholderPrefix}${i + 1}`}
            aria-label={`${genderLabel} ${placeholderPrefix}${i + 1}`}
            onChange={(e) => onNameChange(i, e.target.value)}
            className="min-w-0 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm"
          />
        ))}
      </div>
    </div>
  );
}
