"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearMatchScore, fetchMatchScores, saveMatchScore } from "@/lib/match-scores-api";
import { makeMatchKey, type MatchScores, type MatchScore } from "@/lib/match-scores";

const POLL_MS = 30_000;
const DELETE_VERIFY_RETRIES = 3;
const DELETE_VERIFY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useMatchScores(eventId: string | null) {
  const [scores, setScores] = useState<MatchScores>({});
  const [saving, setSaving] = useState(false);
  const isMutatingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!eventId || isMutatingRef.current) return;
    try {
      const next = await fetchMatchScores(eventId);
      if (isMutatingRef.current) return;
      setScores(next);
    } catch {
      // 조용히 유지 — 시트 미설정·네트워크 오류 시 기존 화면 유지
    }
  }, [eventId]);

  useEffect(() => {
    void refresh();
    if (!eventId) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [eventId, refresh]);

  const verifyScoreRemoved = useCallback(
    async (key: string) => {
      if (!eventId) return;

      for (let attempt = 0; attempt < DELETE_VERIFY_RETRIES; attempt += 1) {
        if (attempt > 0) {
          await sleep(DELETE_VERIFY_DELAY_MS);
        }
        const next = await fetchMatchScores(eventId);
        if (!next[key]) {
          setScores(next);
          return;
        }
      }

      throw new Error("점수 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
    [eventId]
  );

  const save = useCallback(
    async (time: string, court: number, a: number, b: number, df?: MatchScore["df"]) => {
      if (!eventId) return;
      const key = makeMatchKey(time, court);
      isMutatingRef.current = true;
      setSaving(true);
      try {
        await saveMatchScore(eventId, time, court, a, b, df);
        const saved = { a, b, ...(df ? { df } : {}) };
        setScores((prev) => ({ ...prev, [key]: saved }));
        const next = await fetchMatchScores(eventId);
        setScores((prev) => ({ ...prev, ...next, [key]: next[key] ?? saved }));
      } finally {
        isMutatingRef.current = false;
        setSaving(false);
      }
    },
    [eventId]
  );

  const clear = useCallback(
    async (time: string, court: number) => {
      if (!eventId) return;
      const key = makeMatchKey(time, court);
      isMutatingRef.current = true;
      setSaving(true);
      try {
        await clearMatchScore(eventId, time, court);
        setScores((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await verifyScoreRemoved(key);
      } finally {
        isMutatingRef.current = false;
        setSaving(false);
      }
    },
    [eventId, verifyScoreRemoved]
  );

  return { scores, saving, save, clear, refresh };
}
