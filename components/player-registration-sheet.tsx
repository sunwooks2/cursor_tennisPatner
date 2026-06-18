"use client";

import { useEffect, useState } from "react";
import {
  applyRegistrationFields,
  buildRegistrationFields,
  type RegistrationField,
} from "@/lib/roster";
import type { ScheduleInput } from "@/lib/types";

interface PlayerRegistrationSheetProps {
  open: boolean;
  input: ScheduleInput;
  saving: boolean;
  onClose: () => void;
  onSave: (nextInput: ScheduleInput) => Promise<void>;
}

export function PlayerRegistrationSheet({
  open,
  input,
  saving,
  onClose,
  onSave,
}: PlayerRegistrationSheetProps) {
  const [fields, setFields] = useState<RegistrationField[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(buildRegistrationFields(input));
    setError(null);
  }, [open, input]);

  if (!open) return null;

  const handleSave = async () => {
    setError(null);
    try {
      const nextInput = applyRegistrationFields(input, fields);
      await onSave(nextInput);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  };

  return (
    <div className="score-sheet-root" role="presentation" onClick={onClose}>
      <div
        className="score-sheet-panel player-registration-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-registration-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="score-sheet-handle" aria-hidden />
        <div className="score-sheet-header">
          <p id="player-registration-title" className="m-0 text-sm font-semibold text-[var(--muted)]">
            선수등록
          </p>
        </div>

        <p className="player-registration-hint m-0 mt-2 text-xs text-[var(--muted)]">
          슬롯 번호 옆에 실제 이름을 입력하세요. 저장하면 대진표에 반영됩니다.
        </p>

        <div className="player-registration-list mt-3">
          {fields.map((field) => (
            <label key={field.id} className="player-registration-row">
              <span className="player-registration-slot">{field.label}</span>
              <input
                type="text"
                value={field.value}
                onChange={(e) => {
                  const value = e.target.value;
                  setFields((prev) =>
                    prev.map((item) => (item.id === field.id ? { ...item, value } : item))
                  );
                }}
                placeholder="이름 입력"
                className="player-registration-input"
              />
            </label>
          ))}
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
