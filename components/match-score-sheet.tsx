"use client";

import { useEffect, useState, type ReactNode } from "react";
import { parseTypeLabel } from "@/lib/schedule-common";
import { getMatchTypeBadgeClass } from "@/lib/match-theme";
import { parseTeamMatchDisplay } from "@/lib/team-stats";
import { getMatchScoreValidationError, MAX_MATCH_SCORE, type MatchScore } from "@/lib/match-scores";
import type { ScheduleMatch, TeamScheduleInfo } from "@/lib/types";

export interface ScoreEditorTarget {
  time: string;
  court: number;
  match: ScheduleMatch;
}

interface MatchScoreSheetProps {
  target: ScoreEditorTarget | null;
  teamInfo?: TeamScheduleInfo;
  initialScore?: MatchScore;
  saving: boolean;
  onClose: () => void;
  onSave: (a: number, b: number) => Promise<void>;
  onClear: () => Promise<void>;
}

type SideLabel =
  | { kind: "plain"; text: string }
  | { kind: "team"; teamName: string; players: [string, string] };

function renderSideLabel(label: SideLabel): { content: ReactNode; aria: string } {
  if (label.kind === "team") {
    const playersText = `${label.players[0]}·${label.players[1]}`;
    return {
      content: (
        <>
          <span className="font-bold text-[var(--text)]">{label.teamName}</span>
          <span className="font-normal text-[var(--muted)]"> · {playersText}</span>
        </>
      ),
      aria: `${label.teamName} · ${playersText}`,
    };
  }

  return {
    content: label.text,
    aria: label.text,
  };
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: SideLabel;
  value: number;
  onChange: (value: number) => void;
}) {
  const { content, aria } = renderSideLabel(label);
  const decrement = () => onChange(Math.max(0, value - 1));
  const increment = () => onChange(Math.min(MAX_MATCH_SCORE, value + 1));

  return (
    <div className="min-w-0 flex-1">
      <p className="m-0 mb-1.5 truncate text-center text-xs font-semibold text-[var(--muted)]">{content}</p>
      <div className="stepper-control flex overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= 0}
          aria-label={`${aria} 감소`}
          className="stepper-btn flex h-11 w-11 shrink-0 items-center justify-center border-r border-[var(--line)] text-lg font-semibold"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          max={MAX_MATCH_SCORE}
          value={value}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isNaN(parsed)) return;
            onChange(Math.min(MAX_MATCH_SCORE, Math.max(0, parsed)));
          }}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-center text-xl font-semibold tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={increment}
          disabled={value >= MAX_MATCH_SCORE}
          aria-label={`${aria} 증가`}
          className="stepper-btn flex h-11 w-11 shrink-0 items-center justify-center border-l border-[var(--line)] text-lg font-semibold"
        >
          +
        </button>
      </div>
    </div>
  );
}

function sideLabels(target: ScoreEditorTarget, teamInfo?: TeamScheduleInfo): { a: SideLabel; b: SideLabel } {
  const { match } = target;
  if (!match.teamA || !match.teamB) {
    return { a: { kind: "plain", text: "A" }, b: { kind: "plain", text: "B" } };
  }

  const teamDisplay = teamInfo ? parseTeamMatchDisplay(match, teamInfo) : null;
  if (teamDisplay) {
    return {
      a: {
        kind: "team",
        teamName: teamDisplay.sideA.teamName,
        players: teamDisplay.sideA.players,
      },
      b: {
        kind: "team",
        teamName: teamDisplay.sideB.teamName,
        players: teamDisplay.sideB.players,
      },
    };
  }

  return {
    a: { kind: "plain", text: `${match.teamA[0]}·${match.teamA[1]}` },
    b: { kind: "plain", text: `${match.teamB[0]}·${match.teamB[1]}` },
  };
}

export function MatchScoreSheet({
  target,
  teamInfo,
  initialScore,
  saving,
  onClose,
  onSave,
  onClear,
}: MatchScoreSheetProps) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setScoreA(initialScore?.a ?? 0);
    setScoreB(initialScore?.b ?? 0);
    setError(null);
  }, [target, initialScore]);

  if (!target) return null;

  const labels = sideLabels(target, teamInfo);
  const courtLabel = `코트${target.court}`;
  const typeLabel = target.match.type ? parseTypeLabel(target.match.type) : null;

  const handleSave = async () => {
    const validationError = getMatchScoreValidationError(scoreA, scoreB);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      await onSave(scoreA, scoreB);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  };

  const handleClear = async () => {
    setError(null);
    try {
      await onClear();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="score-sheet-root" role="presentation" onClick={onClose}>
      <div
        className="score-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="score-sheet-handle" aria-hidden />
        <div className="score-sheet-header">
          <p id="score-sheet-title" className="m-0 text-sm font-semibold text-[var(--muted)]">
            {target.time} · {courtLabel}
          </p>
          {target.match.type && typeLabel && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${getMatchTypeBadgeClass(target.match.type)}`}
            >
              {typeLabel}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end gap-2.5">
          <ScoreInput label={labels.a} value={scoreA} onChange={setScoreA} />
          <span className="shrink-0 pb-3 text-lg font-semibold text-[var(--muted)]">:</span>
          <ScoreInput label={labels.b} value={scoreB} onChange={setScoreB} />
        </div>

        {error && <p className="m-0 mt-3 text-sm text-[#c0392b]">{error}</p>}

        <div className="score-sheet-actions mt-4">
          <button
            type="button"
            className="score-sheet-action-btn score-sheet-action-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          {initialScore && (
            <button
              type="button"
              className="score-sheet-action-btn score-sheet-action-btn--secondary"
              onClick={() => void handleClear()}
              disabled={saving}
            >
              점수 삭제
            </button>
          )}
          <button
            type="button"
            className="score-sheet-action-btn score-sheet-action-btn--primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
