"use client";

import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/track-event";

const FEEDBACK_TYPES = ["버그", "개선", "기능 추가", "기타"] as const;

function LightbulbIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

interface FeedbackFormProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackForm({ open, onClose }: FeedbackFormProps) {
  const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]>("기능 추가");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setType("기능 추가");
    setContent("");
    setContact("");
    setWebsite("");
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content,
          contact,
          pageUrl: window.location.href,
          website,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "전송에 실패했습니다.");
        return;
      }

      alert("소중한 의견 감사합니다!");
      trackEvent("의견 전송", { type });
      resetForm();
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="feedback-title" className="text-[1.05rem] font-semibold">
            개선제안
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="닫기"
            className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-[#f4f7fb] disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-sm text-[var(--muted)]">
          개선사항이나 추가 요구사항을 알려주세요.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label>
            <span className="mb-1.5 block text-sm font-medium">유형</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof FEEDBACK_TYPES)[number])}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-2.5 text-sm"
            >
              {FEEDBACK_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-medium">내용</span>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              placeholder="어떤 점이 불편했는지, 어떤 기능이 필요한지 적어주세요."
              className="w-full resize-y rounded-lg border border-[var(--line)] px-2.5 py-2.5 text-sm leading-relaxed"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-sm font-medium">연락처 (선택)</span>
            <input
              type="text"
              maxLength={100}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={isSubmitting}
              placeholder="이메일, 카카오톡 ID 등"
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5 text-sm"
            />
          </label>

          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {isSubmitting ? "전송 중" : "보내기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackEvent("개선제안");
          setOpen(true);
        }}
        className="feedback-btn group flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/90 px-3 py-1.5 text-xs font-medium text-[var(--muted)] backdrop-blur-sm"
      >
        <span className="feedback-btn-icon flex h-5 w-5 items-center justify-center rounded-full bg-[var(--highlight)] text-[var(--primary-text)]">
          <LightbulbIcon />
        </span>
        <span className="tracking-tight">개선제안</span>
      </button>
      <FeedbackForm open={open} onClose={() => setOpen(false)} />
    </>
  );
}
