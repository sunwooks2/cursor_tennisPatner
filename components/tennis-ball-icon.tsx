interface TennisBallIconProps {
  className?: string;
  animated?: boolean;
}

export function TennisBallIcon({ className = "", animated = false }: TennisBallIconProps) {
  return (
    <span
      className={`inline-block leading-none ${animated ? "generation-toast-ball" : ""} ${className}`.trim()}
      aria-hidden
    >
      🎾
    </span>
  );
}
