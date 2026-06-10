"use client";

import { NumberStepper } from "@/components/number-stepper";
import { getTeamFemalePrefix, getTeamMalePrefix } from "@/lib/team-stats";
import type { TeamRoster } from "@/lib/types";

function resizeNames(names: string[], count: number): string[] {
  if (count <= names.length) return names.slice(0, count);
  return [...names, ...Array.from({ length: count - names.length }, () => "")];
}

type TeamRosterFormProps = {
  roster: TeamRoster;
  onChange: (roster: TeamRoster) => void;
};

export function TeamRosterForm({ roster, onChange }: TeamRosterFormProps) {
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

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
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
          {roster.maleCount > 0 && (
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                남성 이름 (미입력 시 {malePrefix}1, {malePrefix}2 …)
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Array.from({ length: roster.maleCount }, (_, i) => (
                  <label key={`${sectionKey}-male-${i}`} className="min-w-0">
                    <span className="mb-1 block text-xs text-[var(--muted)]">
                      {malePrefix}
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={roster.maleNames[i] ?? ""}
                      placeholder={`${malePrefix}${i + 1}`}
                      onChange={(e) => {
                        const maleNames = [...resizeNames(roster.maleNames, roster.maleCount)];
                        maleNames[i] = e.target.value;
                        update({ maleNames });
                      }}
                      className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
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
          {roster.femaleCount > 0 && (
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                여성 이름 (미입력 시 {femalePrefix}1, {femalePrefix}2...)
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Array.from({ length: roster.femaleCount }, (_, i) => (
                  <label key={`${sectionKey}-female-${i}`} className="min-w-0">
                    <span className="mb-1 block text-xs text-[var(--muted)]">
                      {femalePrefix}
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={roster.femaleNames[i] ?? ""}
                      placeholder={`${femalePrefix}${i + 1}`}
                      onChange={(e) => {
                        const femaleNames = [...resizeNames(roster.femaleNames, roster.femaleCount)];
                        femaleNames[i] = e.target.value;
                        update({ femaleNames });
                      }}
                      className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
