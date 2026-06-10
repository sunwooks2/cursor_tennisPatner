interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}

function clamp(value: number, min: number, max?: number): number {
  let next = value;
  if (next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return next;
}

export function NumberStepper({ label, value, min, max, onChange }: NumberStepperProps) {
  const decrement = () => onChange(clamp(value - 1, min, max));
  const increment = () => onChange(clamp(value + 1, min, max));

  const handleInputChange = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(clamp(parsed, min, max));
  };

  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[0.92rem]">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label={`${label} 감소`}
          className="flex w-11 shrink-0 items-center justify-center border-r border-[var(--line)] text-lg font-semibold text-[var(--text)] transition-colors hover:bg-[#f4f7fb] disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          required
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-center text-[0.92rem] [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={increment}
          disabled={max !== undefined && value >= max}
          aria-label={`${label} 증가`}
          className="flex w-11 shrink-0 items-center justify-center border-l border-[var(--line)] text-lg font-semibold text-[var(--text)] transition-colors hover:bg-[#f4f7fb] disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </label>
  );
}
