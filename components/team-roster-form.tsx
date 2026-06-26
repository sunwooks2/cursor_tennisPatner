"use client";

import { NumberStepper } from "@/components/number-stepper";
import type { TeamRoster } from "@/lib/types";

function resizeNames(names: string[], count: number): string[] {
  if (count <= names.length) return names.slice(0, count);
  return [...names, ...Array.from({ length: count - names.length }, () => "")];
}

type TeamRosterFormProps = {
  roster: TeamRoster;
  onChange: (roster: TeamRoster) => void;
  showMale?: boolean;
  showFemale?: boolean;
  highlighted?: boolean;
};

export function TeamRosterForm({
  roster,
  onChange,
  showMale = true,
  showFemale = true,
  highlighted = false,
}: TeamRosterFormProps) {
  const update = (patch: Partial<TeamRoster>) => onChange({ ...roster, ...patch });

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[#f8fafc] px-3 py-2.5">
      <label className="mb-2 block">
        <span className="mb-1 block text-sm font-medium">팀 이름</span>
        <input
          type="text"
          value={roster.name}
          maxLength={20}
          placeholder="팀 이름 입력"
          onChange={(e) => update({ name: e.target.value })}
          className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 [&>*]:min-w-0">
        {showFemale && (
          <NumberStepper
            label="여성 인원"
            value={roster.femaleCount}
            min={0}
            onChange={(femaleCount) =>
              update({
                femaleCount,
                femaleNames: resizeNames(roster.femaleNames, femaleCount),
              })
            }
          />
        )}
        {showMale && (
          <NumberStepper
            label="남성 인원"
            value={roster.maleCount}
            min={0}
            highlighted={highlighted}
            onChange={(maleCount) =>
              update({
                maleCount,
                maleNames: resizeNames(roster.maleNames, maleCount),
              })
            }
          />
        )}
      </div>
    </div>
  );
}
