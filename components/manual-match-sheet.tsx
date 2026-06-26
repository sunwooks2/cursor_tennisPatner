"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchTypeIcon } from "@/components/match-type-icon";
import { parseTypeLabel } from "@/lib/schedule-common";
import { getBusyPlayersAtTime, isPlayableMatch } from "@/lib/match-utils";
import type { MatchType, ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

export interface ManualMatchTarget {
  time: string;
  court: number;
  match: ScheduleMatch;
}

interface ManualMatchSheetProps {
  target: ManualMatchTarget | null;
  types: MatchType[];
  males: string[];
  females: string[];
  teamInfo?: TeamScheduleInfo;
  schedule: ScheduleMatch[];
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    type: MatchType;
    teamA: [string, string];
    teamB: [string, string];
  }) => Promise<void>;
  onClear?: () => Promise<void>;
}

function slotAriaLabel(slot: 1 | 2 | 3 | 4, type: MatchType, teamInfo?: TeamScheduleInfo): string {
  if (!teamInfo) return "선수 선택";

  if (type === "MD") {
    const team = slot <= 2 ? teamInfo.teamAName : teamInfo.teamBName;
    const num = slot % 2 === 1 ? "1" : "2";
    return `${team} 남${num}`;
  }
  if (type === "WD") {
    const team = slot <= 2 ? teamInfo.teamAName : teamInfo.teamBName;
    const num = slot % 2 === 1 ? "1" : "2";
    return `${team} 여${num}`;
  }
  const team = slot <= 2 ? teamInfo.teamAName : teamInfo.teamBName;
  const gender = slot % 2 === 1 ? "남" : "여";
  return `${team} ${gender}`;
}

function PlayerSelect({
  ariaLabel,
  value,
  options,
  disabledIds,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: string[];
  disabledIds: Set<string>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className={`manual-match-select${value ? "" : " manual-match-select--empty"}`}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value=""></option>
      {options.map((player) => (
        <option key={player} value={player} disabled={disabledIds.has(player) && player !== value}>
          {player}
        </option>
      ))}
    </select>
  );
}

export function ManualMatchSheet({
  target,
  types,
  males,
  females,
  teamInfo,
  schedule,
  saving = false,
  onClose,
  onSave,
  onClear,
}: ManualMatchSheetProps) {
  const [type, setType] = useState<MatchType>(types[0] ?? "WD");
  const [teamA1, setTeamA1] = useState("");
  const [teamA2, setTeamA2] = useState("");
  const [teamB1, setTeamB1] = useState("");
  const [teamB2, setTeamB2] = useState("");

  useEffect(() => {
    if (!target) return;
    const match = target.match;
    setType(match.type ?? types[0] ?? "WD");
    setTeamA1(match.teamA?.[0] ?? "");
    setTeamA2(match.teamA?.[1] ?? "");
    setTeamB1(match.teamB?.[0] ?? "");
    setTeamB2(match.teamB?.[1] ?? "");
  }, [target, types]);

  const busy = useMemo(() => {
    if (!target) return new Set<string>();
    const set = getBusyPlayersAtTime(schedule, target.time);
    if (isPlayableMatch(target.match)) {
      for (const player of [
        target.match.teamA![0],
        target.match.teamA![1],
        target.match.teamB![0],
        target.match.teamB![1],
      ]) {
        set.delete(player);
      }
    }
    return set;
  }, [schedule, target]);

  const selected = useMemo(
    () => new Set([teamA1, teamA2, teamB1, teamB2].filter(Boolean)),
    [teamA1, teamA2, teamB1, teamB2]
  );

  const pools = useMemo(() => {
    if (type === "MD") {
      const pool = teamInfo
        ? { a1: teamInfo.teamAMales, a2: teamInfo.teamAMales, b1: teamInfo.teamBMales, b2: teamInfo.teamBMales }
        : { a1: males, a2: males, b1: males, b2: males };
      return pool;
    }
    if (type === "WD") {
      const pool = teamInfo
        ? {
            a1: teamInfo.teamAFemales,
            a2: teamInfo.teamAFemales,
            b1: teamInfo.teamBFemales,
            b2: teamInfo.teamBFemales,
          }
        : { a1: females, a2: females, b1: females, b2: females };
      return pool;
    }

    return teamInfo
      ? {
          a1: teamInfo.teamAMales,
          a2: teamInfo.teamAFemales,
          b1: teamInfo.teamBMales,
          b2: teamInfo.teamBFemales,
        }
      : { a1: males, a2: females, b1: males, b2: females };
  }, [teamInfo, type, males, females]);

  if (!target) return null;

  const canSave = Boolean(teamA1 && teamA2 && teamB1 && teamB2);
  const hasAssignment = isPlayableMatch(target.match);
  const disabledFor = (current: string) =>
    new Set([...busy, ...selected].filter((player) => player !== current));

  return (
    <div className="score-sheet-root" role="presentation" onClick={onClose}>
      <div
        className="score-sheet-panel manual-match-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-match-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="score-sheet-handle" aria-hidden />
        <div className="score-sheet-header">
          <p id="manual-match-title" className="m-0 text-sm font-semibold text-[var(--muted)]">
            선수 배정 · {target.time} · 코트{target.court}
          </p>
          <button type="button" className="btn btn-ghost btn-compact" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="manual-match-types">
          {types.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setType(value);
                setTeamA1("");
                setTeamA2("");
                setTeamB1("");
                setTeamB2("");
              }}
              className={`type-chip type-chip--compact ${type === value ? "type-chip--active" : ""}`}
            >
              <span>{parseTypeLabel(value)}</span>
              <MatchTypeIcon type={value} />
            </button>
          ))}
        </div>

        <div className="manual-match-row">
          <PlayerSelect
            ariaLabel={slotAriaLabel(1, type, teamInfo)}
            value={teamA1}
            options={pools.a1}
            disabledIds={disabledFor(teamA1)}
            onChange={setTeamA1}
          />
          <PlayerSelect
            ariaLabel={slotAriaLabel(2, type, teamInfo)}
            value={teamA2}
            options={pools.a2}
            disabledIds={disabledFor(teamA2)}
            onChange={setTeamA2}
          />
          <span className="manual-match-vs">VS</span>
          <PlayerSelect
            ariaLabel={slotAriaLabel(3, type, teamInfo)}
            value={teamB1}
            options={pools.b1}
            disabledIds={disabledFor(teamB1)}
            onChange={setTeamB1}
          />
          <PlayerSelect
            ariaLabel={slotAriaLabel(4, type, teamInfo)}
            value={teamB2}
            options={pools.b2}
            disabledIds={disabledFor(teamB2)}
            onChange={setTeamB2}
          />
        </div>

        <div className="score-sheet-actions mt-3">
          <button
            type="button"
            className="score-sheet-action-btn score-sheet-action-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          {hasAssignment && onClear ? (
            <button
              type="button"
              className="score-sheet-action-btn score-sheet-action-btn--secondary"
              disabled={saving}
              onClick={() => void onClear()}
            >
              비우기
            </button>
          ) : null}
          <button
            type="button"
            className="score-sheet-action-btn score-sheet-action-btn--primary"
            disabled={!canSave || saving}
            onClick={() =>
              void onSave({
                type,
                teamA: [teamA1, teamA2],
                teamB: [teamB1, teamB2],
              })
            }
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
