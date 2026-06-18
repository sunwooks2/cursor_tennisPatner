import { GenderIcon } from "@/components/gender-icon";

interface PlayerNameWithGenderProps {
  name: string;
  isMale: boolean;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
  nameClassName?: string;
}

export function PlayerNameWithGender({
  name,
  isMale,
  active = false,
  onClick,
  title,
  className = "",
  nameClassName = "text-sm font-semibold",
}: PlayerNameWithGenderProps) {
  const content = (
    <>
      <GenderIcon gender={isMale ? "male" : "female"} />
      <span className={nameClassName}>{name}</span>
    </>
  );

  const wrapperClass = `inline-flex min-w-0 items-center gap-1 ${className}`.trim();

  if (!onClick) {
    return <span className={wrapperClass}>{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${wrapperClass} text-left underline-offset-2 hover:underline ${
        active ? "text-[var(--primary-text)] underline" : "text-[var(--text)]"
      }`}
      title={title}
    >
      {content}
    </button>
  );
}
