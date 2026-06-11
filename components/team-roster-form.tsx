"use client";

import { NumberStepper } from "@/components/number-stepper";
import { PlayerNameInputRow } from "@/components/player-name-input-row";
import { getTeamFemalePrefix, getTeamMalePrefix } from "@/lib/team-stats";
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
};

export function TeamRosterForm({
  roster,
  onChange,
  showMale = true,
  showFemale = true,
}: TeamRosterFormProps) {
  const update = (patch: Partial<TeamRoster>) => onChange({ ...roster, ...patch });
  const malePrefix = getTeamMalePrefix(roster.name);
  const femalePrefix = getTeamFemalePrefix(roster.name);
  const sectionKey = roster.name.trim() || "team-section";

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

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 [&>*]:min-w-0">
          {showMale && (
            <NumberStepper
              label="남성 인원"
              value={roster.maleCount}
              min={0}
              onChange={(maleCount) =>
                update({
                  maleCount,
                  maleNames: resizeNames(roster.maleNames, maleCount),
                })
              }
            />
          )}
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
        </div>

        {showMale && (
          <PlayerNameInputRow
            genderLabel="남자"
            count={roster.maleCount}
            names={roster.maleNames}
            placeholderPrefix={malePrefix}
            keyPrefix={`${sectionKey}-male`}
            onNameChange={(index, value) => {
              const maleNames = [...resizeNames(roster.maleNames, roster.maleCount)];
              maleNames[index] = value;
              update({ maleNames });
            }}
          />
        )}

        {showFemale && (
          <PlayerNameInputRow
            genderLabel="여자"
            count={roster.femaleCount}
            names={roster.femaleNames}
            placeholderPrefix={femalePrefix}
            keyPrefix={`${sectionKey}-female`}
            onNameChange={(index, value) => {
              const femaleNames = [...resizeNames(roster.femaleNames, roster.femaleCount)];
              femaleNames[index] = value;
              update({ femaleNames });
            }}
          />
        )}
      </div>
    </div>
  );
}
