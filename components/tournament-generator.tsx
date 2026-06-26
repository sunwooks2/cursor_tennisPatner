"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  generateSchedule,
  formatMatchText,
  validateInput,
} from "@/lib/schedule";
import {
  exportElementAsImage,
  exportPrintLayoutAsLandscapeImage,
  isMobileDevice,
} from "@/lib/export-image";
import { FeedbackButton } from "@/components/feedback-form";
import { ScheduleExportActions } from "@/components/schedule-export-actions";
import { GenerationToast } from "@/components/generation-toast";
import { MatchTypeIcon } from "@/components/match-type-icon";
import { TennisBallIcon } from "@/components/tennis-ball-icon";
import { NumberStepper } from "@/components/number-stepper";
import { PlayerNameInputRow } from "@/components/player-name-input-row";
import { PlayerMatchCountSummary } from "@/components/player-match-count-summary";
import { PlayerDoubleFaultStats } from "@/components/player-double-fault-stats";
import { PlayerScoreRanking } from "@/components/player-score-ranking";
import { TeamScoreSummary } from "@/components/team-score-summary";
import { MobileScheduleByTime } from "@/components/mobile-schedule-by-time";
import { PlayerHighlightChips } from "@/components/player-highlight-chips";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PlayerStatsBars } from "@/components/player-stats-bars";
import { PlayerStatsPrint } from "@/components/player-stats-print";
import { TeamRosterForm } from "@/components/team-roster-form";
import {
  applyTeamRosterDefaultsForTypes,
  DEFAULT_FREE_DOUBLES_COUNT,
  DEFAULT_INPUT,
  formatTeamSummary,
  parseInputFromSearchParams,
  resizeNames,
} from "@/lib/parse-schedule-input";
import { formatMaxCourtsHint } from "@/lib/court-capacity";
import { MatchScoreSheet, type ScoreEditorTarget } from "@/components/match-score-sheet";
import { PlayerRegistrationSheet } from "@/components/player-registration-sheet";
import { ManualMatchSheet, type ManualMatchTarget } from "@/components/manual-match-sheet";
import { getScoreForSlot, ScheduleSlotCell } from "@/components/schedule-slot-cell";
import { createEventId } from "@/lib/match-scores";
import {
  areAllMatchesScored,
  computeFreeScoreRankingGroups,
  computeTeamScoreRankingGroups,
  hasRecordedScores,
  hasScoreRankingEntries,
} from "@/lib/player-score-totals";
import {
  computeFreeDoubleFaultGroups,
  computeTeamDoubleFaultGroups,
  hasDoubleFaultEntries,
  hasRecordedDoubleFaults,
} from "@/lib/double-fault-totals";
import { computeTeamScoreTotals } from "@/lib/team-score-totals";
import { useMatchScores } from "@/lib/use-match-scores";
import {
  buildScheduleShareUrl,
  parseEventIdFromSearchParams,
  shareScheduleLink,
} from "@/lib/share-link";
import { isRestSlotForPlayer } from "@/lib/match-highlight";
import { RestTimeView } from "@/components/rest-time-view";
import { getFilterChipClass } from "@/lib/match-theme";
import {
  getGenerationFeedbackMessage,
  type GenerationFeedbackType,
} from "@/lib/generation-feedback";
import { trackEvent } from "@/lib/track-event";
import { fetchEventRoster, saveEventRoster } from "@/lib/roster-api";
import { fetchEventSchedule, saveEventSchedule } from "@/lib/schedule-api";
import { mergeRosterIntoInput, rosterFromInput } from "@/lib/roster";
import {
  isTeamStyleSchedule,
  parseManualSchedule,
  rebuildManualGenerated,
  validateManualMatchAssignment,
} from "@/lib/schedule-manual";
import { typesNeedFemale, typesNeedMale } from "@/lib/match-type-gender";
import {
  addHoursToTime,
  DURATION_HOUR_OPTIONS,
  inferDurationHours,
  type DurationHours,
} from "@/lib/schedule-duration";
import type {
  CourtFilter,
  GeneratedSchedule,
  ManualLayout,
  MatchType,
  ScheduleInput,
  ScheduleMode,
} from "@/lib/types";

const TYPE_OPTIONS: { value: MatchType; label: string }[] = [
  { value: "WD", label: "여자복식" },
  { value: "MD", label: "남자복식" },
  { value: "MXD", label: "혼합복식" },
];

const MODE_OPTIONS: { value: ScheduleMode; label: string }[] = [
  { value: "free", label: "기본" },
  { value: "team", label: "팀전" },
  { value: "manual", label: "수동" },
];

const MANUAL_LAYOUT_OPTIONS: { value: ManualLayout; label: string }[] = [
  { value: "free", label: "기본" },
  { value: "team", label: "팀전" },
];

export function TournamentGenerator() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState<ScheduleInput>(DEFAULT_INPUT);
  const [seed, setSeed] = useState(Date.now());
  const [generated, setGenerated] = useState<GeneratedSchedule | null>(null);
  const [courtFilter, setCourtFilter] = useState<CourtFilter>("ALL");
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [isPrintExporting, setIsPrintExporting] = useState(false);
  const [generationToast, setGenerationToast] = useState<{ message: string; id: number } | null>(
    null
  );
  const [resultsPulse, setResultsPulse] = useState(false);
  const [generateFlash, setGenerateFlash] = useState<GenerationFeedbackType | null>(null);
  const [durationHours, setDurationHours] = useState<DurationHours | null>(2);
  const [eventId, setEventId] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [rosterSaving, setRosterSaving] = useState(false);
  const [scoreEditor, setScoreEditor] = useState<ScoreEditorTarget | null>(null);
  const [manualEditor, setManualEditor] = useState<ManualMatchTarget | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [sharedLoadError, setSharedLoadError] = useState<string | null>(null);
  const actionBtnRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const printExportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef(input);
  const seedRef = useRef(seed);
  const rosterSnapshotRef = useRef("");
  inputRef.current = input;
  seedRef.current = seed;

  const triggerGenerationFeedback = useCallback(
    (type: GenerationFeedbackType, result: GeneratedSchedule) => {
      setGenerationToast({
        message: getGenerationFeedbackMessage(type, result),
        id: Date.now(),
      });
      setResultsPulse(true);
      setGenerateFlash(type);
      window.setTimeout(() => setResultsPulse(false), 1000);
      window.setTimeout(() => setGenerateFlash(null), 400);
      window.setTimeout(() => {
        actionBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    },
    []
  );

  const runGenerate = useCallback(
    (
      nextInput: ScheduleInput,
      nextSeed: number,
      feedback?: GenerationFeedbackType,
      nextEventId?: string | null
    ) => {
      const error = validateInput(nextInput);
      if (error) {
        alert(error);
        return;
      }
      const result = generateSchedule(nextInput, nextSeed);
      const eid = nextEventId ?? createEventId();
      setInput(nextInput);
      setSeed(nextSeed);
      setEventId(eid);
      setCourtFilter("ALL");
      setHighlightedPlayer(null);
      setScoreEditor(null);
      setManualEditor(null);
      setGenerated(result);
      if (nextInput.mode === "manual") {
        void saveEventSchedule(eid, {
          mode: "manual",
          manualLayout: nextInput.manualLayout,
          schedule: result.schedule,
        }).catch(() => {});
      }
      if (feedback) {
        triggerGenerationFeedback(feedback, result);
      }
    },
    [triggerGenerationFeedback]
  );

  const { scores: matchScores, saving: scoreSaving, save: saveScore, clear: clearScore } =
    useMatchScores(eventId);

  useEffect(() => {
    if (initialized) return;
    let cancelled = false;

    async function init() {
      const { input: parsedInput, seed: parsedSeed } = parseInputFromSearchParams(searchParams);
      const parsedEventId = parseEventIdFromSearchParams(searchParams);
      let mergedInput = parsedInput;
      let rosterLoaded = false;

      if (parsedEventId) {
        try {
          const roster = await fetchEventRoster(parsedEventId);
          if (roster) {
            mergedInput = mergeRosterIntoInput(parsedInput, roster);
            rosterSnapshotRef.current = JSON.stringify(roster);
            rosterLoaded = true;
          }
        } catch {
          // roster fetch failure should not block schedule view
        }
      }

      if (cancelled) return;

      setInput(mergedInput);
      setDurationHours(inferDurationHours(mergedInput.startTime, mergedInput.endTime));
      if (parsedEventId) {
        setEventId(parsedEventId);
      }

      const validationError = validateInput(mergedInput);
      const isManualShared = mergedInput.mode === "manual" && parsedEventId;
      const isAutoShared =
        searchParams.has("seed") && mergedInput.mode !== "manual" && Boolean(parsedEventId);

      if (isManualShared) {
        if (validationError) {
          setSharedLoadError(
            rosterLoaded
              ? validationError
              : "선수 등록 정보를 불러오지 못했습니다. 공유 링크를 다시 확인하거나 잠시 후 다시 시도해주세요."
          );
        } else {
          try {
            const base = generateSchedule(mergedInput, parsedSeed);
            let schedule = base.schedule;
            try {
              const persisted = await fetchEventSchedule(parsedEventId);
              if (persisted?.schedule) {
                const parsed = parseManualSchedule(persisted.schedule);
                if (parsed) schedule = parsed;
              }
            } catch {
              // schedule fetch failure should not block view
            }
            setSeed(parsedSeed);
            setGenerated(rebuildManualGenerated(base, schedule, mergedInput));
          } catch {
            setSharedLoadError("대진표를 불러오지 못했습니다.");
          }
        }
      } else if (searchParams.has("seed") && mergedInput.mode !== "manual" && !validationError) {
        runGenerate(mergedInput, parsedSeed, undefined, parsedEventId);
      } else if (isAutoShared && validationError) {
        setSharedLoadError(validationError);
      }
      setInitialized(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [initialized, runGenerate, searchParams]);

  useEffect(() => {
    if (!eventId || !generated) return;

    const refreshRoster = async () => {
      try {
        const roster = await fetchEventRoster(eventId);
        const snapshot = roster ? JSON.stringify(roster) : "";
        if (snapshot === rosterSnapshotRef.current) return;
        rosterSnapshotRef.current = snapshot;
        if (!roster) return;

        const merged = mergeRosterIntoInput(inputRef.current, roster);
        if (inputRef.current.mode === "manual") {
          setInput(merged);
          setGenerated((prev) =>
            prev ? rebuildManualGenerated(prev, prev.schedule, merged) : prev
          );
          return;
        }
        runGenerate(merged, seedRef.current, undefined, eventId);
      } catch {
        // ignore background refresh errors
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshRoster();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [eventId, generated, runGenerate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    trackEvent("page_view", {
      shared: params.has("seed") || (params.get("mode") === "manual" && params.has("eid")),
      mode: params.get("mode") === "team" ? "team" : params.get("mode") === "manual" ? "manual" : "free",
    });
  }, []);

  const schedule = generated?.schedule ?? [];
  const courtCount = input.courtCount;

  const slotMap = useMemo(() => {
    const map = new Map<string, typeof schedule>();
    for (const item of schedule) {
      if (!map.has(item.time)) map.set(item.time, []);
      map.get(item.time)!.push(item);
    }
    return map;
  }, [schedule]);

  const courtFilterOptions = useMemo(
    () => [
      { value: "ALL" as const, label: "전체" },
      ...Array.from({ length: courtCount }, (_, i) => ({
        value: i + 1,
        label: `코트${i + 1}`,
      })),
    ],
    [courtCount]
  );

  const visibleCourts = useMemo(
    () =>
      courtFilter === "ALL"
        ? Array.from({ length: courtCount }, (_, i) => i + 1)
        : [courtFilter],
    [courtCount, courtFilter]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    trackEvent("대진 생성", {
      mode: input.mode,
      courtCount: input.courtCount,
      ...(input.mode === "free"
        ? { maleCount: input.maleCount, femaleCount: input.femaleCount }
        : {
            teamA: input.teamA.name,
            teamB: input.teamB.name,
            teamAMales: input.teamA.maleCount,
            teamAFemales: input.teamA.femaleCount,
            teamBMales: input.teamB.maleCount,
            teamBFemales: input.teamB.femaleCount,
          }),
    });
    runGenerate(input, Date.now(), "create");
  };

  const handleRegenerate = () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }
    if (generated.mode === "manual") {
      if (!window.confirm("배정한 선수 정보가 모두 지워집니다. 격자를 초기화할까요?")) {
        return;
      }
      trackEvent("격자 초기화");
    } else {
      trackEvent("다시 생성");
    }
    runGenerate(input, Date.now(), "regenerate");
  };

  const handleShare = async () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }

    trackEvent("공유");
    if (!eventId) {
      alert("이벤트 ID가 없습니다. 대진을 다시 생성해주세요.");
      return;
    }

    try {
      const roster = rosterFromInput(input);
      await saveEventRoster(eventId, roster);
      rosterSnapshotRef.current = JSON.stringify(roster);
    } catch {
      alert("선수 등록 정보 저장에 실패했습니다.");
      return;
    }

    if (generated.mode === "manual") {
      try {
        await saveEventSchedule(eventId, {
          mode: "manual",
          manualLayout: input.manualLayout,
          schedule: generated.schedule,
        });
      } catch {
        alert("대진표 저장에 실패했습니다.");
        return;
      }
    }

    const url = buildScheduleShareUrl(input, seed, eventId);
    try {
      const result = await shareScheduleLink(url);
      if (result === "shared") {
        alert("공유했습니다.");
      } else {
        alert("공유 링크를 복사했습니다.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      alert("공유에 실패했습니다.");
    }
  };

  const handleRegistrationSave = async (nextInput: ScheduleInput) => {
    if (!eventId) {
      throw new Error("이벤트 ID가 없습니다. 대진을 다시 생성해주세요.");
    }

    setRosterSaving(true);
    try {
      const roster = rosterFromInput(nextInput);
      await saveEventRoster(eventId, roster);
      rosterSnapshotRef.current = JSON.stringify(roster);
      if (nextInput.mode === "manual" && generated) {
        setInput(nextInput);
        setGenerated(rebuildManualGenerated(generated, generated.schedule, nextInput));
      } else {
        runGenerate(nextInput, seed, undefined, eventId);
      }
      trackEvent("선수등록 저장");
    } finally {
      setRosterSaving(false);
    }
  };

  const handleEditManual = (target: ManualMatchTarget) => {
    trackEvent("수동배정", { time: target.time, court: target.court });
    setManualEditor(target);
  };

  const handleManualSave = async (payload: {
    type: MatchType;
    teamA: [string, string];
    teamB: [string, string];
  }) => {
    if (!generated || !manualEditor) return;

    const error = validateManualMatchAssignment(
      generated.schedule,
      manualEditor.time,
      manualEditor.court,
      payload.type,
      payload.teamA,
      payload.teamB,
      generated.males
    );
    if (error) {
      alert(error);
      return;
    }

    setManualSaving(true);
    try {
      const schedule = generated.schedule.map((match) =>
        match.time === manualEditor.time && match.court === manualEditor.court
          ? {
              time: match.time,
              court: match.court,
              type: payload.type,
              teamA: payload.teamA,
              teamB: payload.teamB,
            }
          : match
      );
      const next = rebuildManualGenerated(generated, schedule, input);
      setGenerated(next);
      setManualEditor(null);
      if (eventId) {
        await saveEventSchedule(eventId, {
          mode: "manual",
          manualLayout: input.manualLayout,
          schedule,
        });
      }
      trackEvent("수동배정 저장");
    } finally {
      setManualSaving(false);
    }
  };

  const handleManualClear = async () => {
    if (!generated || !manualEditor) return;

    setManualSaving(true);
    try {
      const schedule = generated.schedule.map((match) =>
        match.time === manualEditor.time && match.court === manualEditor.court
          ? { time: match.time, court: match.court, pending: true }
          : match
      );
      const next = rebuildManualGenerated(generated, schedule, input);
      setGenerated(next);
      setManualEditor(null);
      await clearScore(manualEditor.time, manualEditor.court);
      if (eventId) {
        await saveEventSchedule(eventId, {
          mode: "manual",
          manualLayout: input.manualLayout,
          schedule,
        });
      }
    } finally {
      setManualSaving(false);
    }
  };

  const handleImageDownload = async () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }
    if (!exportRef.current) return;

    trackEvent("이미지저장");
    setIsExporting(true);
    try {
      const filename = `tennis-schedule-${input.startTime.replace(":", "")}.png`;
      await exportElementAsImage(exportRef.current, filename);
    } catch {
      alert("이미지 저장에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExcelDownload = async () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }

    setIsExcelExporting(true);
    trackEvent("엑셀저장");
    try {
      const { downloadPrintLayoutExcel } = await import("@/lib/download-excel");
      const filename = `tennis-schedule-${input.startTime.replace(":", "")}.xlsx`;
      await downloadPrintLayoutExcel(input, generated, slotMap, filename);
    } catch {
      alert("엑셀 저장에 실패했습니다.");
    } finally {
      setIsExcelExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }

    trackEvent("인쇄", { mobile: isMobileDevice() });

    if (isMobileDevice()) {
      if (!printExportRef.current) return;

      setIsPrintExporting(true);
      try {
        const filename = `tennis-schedule-print-${input.startTime.replace(":", "")}.png`;
        await exportPrintLayoutAsLandscapeImage(printExportRef.current, filename, { pixelRatio: 2 });
      } catch {
        alert("인쇄용 이미지 저장에 실패했습니다.");
      } finally {
        setIsPrintExporting(false);
      }
      return;
    }

    window.print();
  };

  const toggleType = (type: MatchType) => {
    setInput((prev) => {
      const exists = prev.types.includes(type);
      const types = exists ? prev.types.filter((t) => t !== type) : [...prev.types, type];
      const needMale = typesNeedMale(types);
      const needFemale = typesNeedFemale(types);
      const adding = !exists;

      const isFreeStyle = prev.mode === "free" || (prev.mode === "manual" && prev.manualLayout === "free");

      if (isFreeStyle) {
        let maleCount = needMale ? prev.maleCount : 0;
        let femaleCount = needFemale ? prev.femaleCount : 0;
        let maleNames = needMale ? prev.maleNames : [];
        let femaleNames = needFemale ? prev.femaleNames : [];

        if (adding && type === "MD" && maleCount === 0) {
          maleCount = DEFAULT_FREE_DOUBLES_COUNT;
          maleNames = resizeNames(maleNames, maleCount);
        }
        if (adding && type === "WD" && femaleCount === 0) {
          femaleCount = DEFAULT_FREE_DOUBLES_COUNT;
          femaleNames = resizeNames(femaleNames, femaleCount);
        }

        return { ...prev, types, maleCount, maleNames, femaleCount, femaleNames };
      }

      let teamA = { ...prev.teamA };
      let teamB = { ...prev.teamB };

      if (!needMale) {
        teamA = { ...teamA, maleCount: 0, maleNames: [] };
        teamB = { ...teamB, maleCount: 0, maleNames: [] };
      }
      if (!needFemale) {
        teamA = { ...teamA, femaleCount: 0, femaleNames: [] };
        teamB = { ...teamB, femaleCount: 0, femaleNames: [] };
      }

      const teamDefaults = applyTeamRosterDefaultsForTypes(teamA, teamB, types);
      return { ...prev, types, ...teamDefaults };
    });
  };

  const handleStartTimeChange = (startTime: string) => {
    setInput((prev) => ({
      ...prev,
      startTime,
      endTime: durationHours ? addHoursToTime(startTime, durationHours) : prev.endTime,
    }));
  };

  const handleDurationHoursChange = (hours: DurationHours) => {
    setDurationHours(hours);
    setInput((prev) => ({
      ...prev,
      endTime: addHoursToTime(prev.startTime, hours),
    }));
  };

  const handleEndTimeChange = (endTime: string) => {
    setDurationHours(inferDurationHours(input.startTime, endTime));
    setInput((prev) => ({ ...prev, endTime }));
  };

  const handleMaleCountChange = (maleCount: number) => {
    setInput((prev) => ({
      ...prev,
      maleCount,
      maleNames: resizeNames(prev.maleNames, maleCount),
    }));
  };

  const handleFemaleCountChange = (femaleCount: number) => {
    setInput((prev) => ({
      ...prev,
      femaleCount,
      femaleNames: resizeNames(prev.femaleNames, femaleCount),
    }));
  };

  const handleMaleNameChange = (index: number, name: string) => {
    setInput((prev) => {
      const maleNames = [...resizeNames(prev.maleNames, prev.maleCount)];
      maleNames[index] = name;
      return { ...prev, maleNames };
    });
  };

  const handleFemaleNameChange = (index: number, name: string) => {
    setInput((prev) => {
      const femaleNames = [...resizeNames(prev.femaleNames, prev.femaleCount)];
      femaleNames[index] = name;
      return { ...prev, femaleNames };
    });
  };

  const handleModeChange = (mode: ScheduleMode) => {
    setInput((prev) => {
      if (mode === "team") {
        const teamDefaults = applyTeamRosterDefaultsForTypes(prev.teamA, prev.teamB, prev.types);
        return { ...prev, mode, ...teamDefaults };
      }
      if (mode === "manual") {
        return { ...prev, mode, manualLayout: prev.manualLayout ?? "free" };
      }
      return { ...prev, mode };
    });
    setHighlightedPlayer(null);
    setGenerated(null);
  };

  const handleManualLayoutChange = (layout: ManualLayout) => {
    setInput((prev) => {
      if (layout === "team") {
        const teamDefaults = applyTeamRosterDefaultsForTypes(prev.teamA, prev.teamB, prev.types);
        return { ...prev, manualLayout: layout, ...teamDefaults };
      }
      return { ...prev, manualLayout: layout };
    });
    setHighlightedPlayer(null);
    setGenerated(null);
  };

  const handleHighlightPlayer = (player: string | null) => {
    setHighlightedPlayer(player);
    if (player) trackEvent("내경기 하이라이트", { player });
  };

  const trackMatchCountSectionToggle = (open: boolean) => {
    trackEvent(open ? "참가자별 경기횟수 펼침" : "참가자별 경기횟수 접기");
  };

  const trackPairStatsSectionToggle = (open: boolean) => {
    trackEvent(open ? "페어상대 통계 펼침" : "페어상대 통계 접기");
  };

  const handleEditScore = (target: ScoreEditorTarget) => {
    trackEvent("점수입력", { time: target.time, court: target.court });
    setScoreEditor(target);
  };

  const highlightPlayers = useMemo(
    () => generated?.playerStats.map((s) => s.player) ?? [],
    [generated?.playerStats]
  );

  const playerScoreRankingGroups = useMemo(() => {
    if (!generated || !hasRecordedScores(matchScores)) return [];
    if (isTeamStyleSchedule(generated) && generated.teamInfo) {
      return computeTeamScoreRankingGroups(
        generated.schedule,
        matchScores,
        generated.teamInfo
      );
    }
    return [
      computeFreeScoreRankingGroups(
        generated.schedule,
        matchScores,
        generated.males,
        generated.females
      ),
    ];
  }, [generated, matchScores]);

  const showScoreRankings =
    playerScoreRankingGroups.length > 0 && hasScoreRankingEntries(playerScoreRankingGroups);

  const teamScoreTotals = useMemo(() => {
    if (!generated?.teamInfo || !hasRecordedScores(matchScores)) return [];
    return computeTeamScoreTotals(generated.schedule, matchScores, generated.teamInfo);
  }, [generated, matchScores]);

  const allMatchesScored = useMemo(() => {
    if (!generated) return false;
    return areAllMatchesScored(generated.schedule, matchScores);
  }, [generated, matchScores]);

  const doubleFaultGroups = useMemo(() => {
    if (!generated || !hasRecordedDoubleFaults(matchScores)) return [];
    if (isTeamStyleSchedule(generated) && generated.teamInfo) {
      return computeTeamDoubleFaultGroups(
        generated.schedule,
        matchScores,
        generated.males,
        generated.teamInfo
      );
    }
    return [computeFreeDoubleFaultGroups(generated.schedule, matchScores, generated.males, generated.females)];
  }, [generated, matchScores]);

  const showDoubleFaultStats =
    doubleFaultGroups.length > 0 && hasDoubleFaultEntries(doubleFaultGroups);

  const isScheduleViewMode =
    searchParams.has("seed") ||
    (searchParams.get("mode") === "manual" && searchParams.has("eid"));

  const isManualMode = generated?.mode === "manual";
  const showFreeRoster =
    input.mode === "free" || (input.mode === "manual" && input.manualLayout === "free");
  const showTeamRoster =
    input.mode === "team" || (input.mode === "manual" && input.manualLayout === "team");

  const highlightActive = !!highlightedPlayer && !isExporting;

  const needsMale = input.types.includes("MD") || input.types.includes("MXD");
  const needsFemale = input.types.includes("WD") || input.types.includes("MXD");
  const maxCourtsHint = formatMaxCourtsHint(input);

  const matchCount = generated?.schedule.filter((m) => !m.empty).length ?? 0;
  const teamSummary =
    generated && isTeamStyleSchedule(generated) && generated.teamInfo
      ? formatTeamSummary(
          generated.teamInfo.teamAName,
          generated.teamInfo.teamBName,
          input.teamA.maleCount,
          input.teamA.femaleCount,
          input.teamB.maleCount,
          input.teamB.femaleCount,
          matchCount,
          generated.teamInfo.teamATotalMatches,
          generated.teamInfo.teamBTotalMatches
        )
      : null;

  return (
    <main className="mx-auto w-full max-w-[1120px] p-4">
      <header className="no-print mb-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="app-title mb-0 flex min-w-0 items-center gap-2">
            <span className="app-title-icon">
              <TennisBallIcon className="h-[1.35rem] w-[1.35rem]" />
            </span>
            <span className="app-title-text">테니스 대진표 생성기</span>
          </h1>
          <FeedbackButton />
        </div>
      </header>

      {!isScheduleViewMode && (
      <section className="no-print mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
        <div className="mode-segment-row mb-3">
          <div className="mode-segmented">
            {MODE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleModeChange(value)}
                className={`mode-segment ${input.mode === value ? "mode-segment--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          {input.mode === "manual" && (
            <div className="mode-segmented mode-segmented--compact">
              {MANUAL_LAYOUT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleManualLayoutChange(value)}
                  className={`mode-segment mode-segment--compact ${input.manualLayout === value ? "mode-segment--active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold text-[var(--muted)]">경기 유형</p>
          <div className="type-chip-group">
            {TYPE_OPTIONS.map(({ value, label }) => {
              const active = input.types.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={(e) => {
                    toggleType(value);
                    e.currentTarget.blur();
                  }}
                  className={`type-chip ${active ? "type-chip--active" : ""}`}
                  aria-pressed={active}
                >
                  <span>{label}</span>
                  <MatchTypeIcon type={value} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-semibold text-[var(--muted)]">진행시간</p>
          <div className="type-chip-group">
            {DURATION_HOUR_OPTIONS.map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={(e) => {
                  handleDurationHoursChange(hours);
                  e.currentTarget.blur();
                }}
                className={`type-chip ${durationHours === hours ? "type-chip--active" : ""}`}
                aria-pressed={durationHours === hours}
              >
                {hours}시간
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
          <div className="col-span-full grid grid-cols-2 gap-2 md:grid-cols-4 [&>*]:min-w-0">
            <NumberStepper
              label="코트 수"
              value={input.courtCount}
              min={1}
              highlighted={!!maxCourtsHint}
              onChange={(courtCount) => setInput((prev) => ({ ...prev, courtCount }))}
            />
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[0.92rem]">경기시간(분)</span>
              <input
                type="number"
                min={10}
                step={5}
                required
                value={input.matchMinutes}
                onChange={(e) => setInput((prev) => ({ ...prev, matchMinutes: Number(e.target.value) }))}
                className="form-control-input w-full rounded-lg border border-[var(--line)] bg-white px-2 py-2.5 text-[0.92rem] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[0.92rem]">시작시간</span>
              <input
                type="time"
                required
                value={input.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="form-control-input w-full rounded-lg border border-[var(--line)] bg-white px-2 py-2.5 text-[0.92rem]"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[0.92rem]">종료시간</span>
              <input
                type="time"
                required
                value={input.endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="form-control-input w-full rounded-lg border border-[var(--line)] bg-white px-2 py-2.5 text-[0.92rem]"
              />
            </label>
          </div>
          {maxCourtsHint && (
            <p className="court-capacity-hint col-span-full">{maxCourtsHint}</p>
          )}
          {showFreeRoster ? (
            (needsMale || needsFemale) && (
              <div className="col-span-full flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 [&>*]:min-w-0">
                  {needsFemale && (
                    <NumberStepper
                      label="여성 인원수"
                      value={input.femaleCount}
                      min={0}
                      highlighted={!!maxCourtsHint}
                      onChange={handleFemaleCountChange}
                    />
                  )}
                  {needsMale && (
                    <NumberStepper
                      label="남성 인원수"
                      value={input.maleCount}
                      min={0}
                      highlighted={!!maxCourtsHint}
                      onChange={handleMaleCountChange}
                    />
                  )}
                </div>
                {needsFemale && (
                  <PlayerNameInputRow
                    genderLabel="여자"
                    count={input.femaleCount}
                    names={input.femaleNames}
                    placeholderPrefix="여"
                    keyPrefix="female-name"
                    onNameChange={handleFemaleNameChange}
                    className="rounded-lg border border-[var(--line)] bg-[#f8fafc] px-2 py-2"
                  />
                )}
                {needsMale && (
                  <PlayerNameInputRow
                    genderLabel="남자"
                    count={input.maleCount}
                    names={input.maleNames}
                    placeholderPrefix="남"
                    keyPrefix="male-name"
                    onNameChange={handleMaleNameChange}
                    className="rounded-lg border border-[var(--line)] bg-[#f8fafc] px-2 py-2"
                  />
                )}
                {input.mode === "manual" && (
                  <p className="text-sm text-[var(--muted)]">
                    수동 모드에서는 빈 슬롯만 생성됩니다. 각 코트·시간을 탭해 직접 선수를 배정하세요.
                  </p>
                )}
              </div>
            )
          ) : showTeamRoster ? (
            <div className="col-span-full space-y-3">
              <TeamRosterForm
                roster={input.teamA}
                showMale={needsMale}
                showFemale={needsFemale}
                highlighted={!!maxCourtsHint}
                onChange={(teamA) => setInput((prev) => ({ ...prev, teamA }))}
              />
              <TeamRosterForm
                roster={input.teamB}
                showMale={needsMale}
                showFemale={needsFemale}
                highlighted={!!maxCourtsHint}
                onChange={(teamB) => setInput((prev) => ({ ...prev, teamB }))}
              />
              {input.mode === "team" ? (
                <p className="text-sm text-[var(--muted)]">
                  팀 인원이 다르면 인원이 적은 팀 선수에게 경기가 더 많이 배정될 수 있습니다. 가능한 범위에서
                  개인별 경기 수를 균등하게 맞춥니다.
                </p>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  수동 모드에서는 빈 슬롯만 생성됩니다. 각 코트·시간을 탭해 직접 선수를 배정하세요.
                </p>
              )}
            </div>
          ) : null}

          <div ref={actionBtnRef} className="action-btn-row col-span-full">
            <button
              type="submit"
              className={`btn btn-primary ${generateFlash === "create" ? "generation-btn-flash" : ""}`}
            >
              {input.mode === "manual" ? "격자 생성" : "대진 생성"}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className={`btn btn-secondary ${generateFlash === "regenerate" ? "generation-btn-flash" : ""}`}
            >
              {input.mode === "manual" ? "격자 초기화" : "다시 생성"}
            </button>
            <ScheduleExportActions
              onShare={handleShare}
              onImageDownload={handleImageDownload}
              onExcelDownload={handleExcelDownload}
              onPrint={handlePrint}
              isExporting={isExporting}
              isExcelExporting={isExcelExporting}
              isPrintExporting={isPrintExporting}
            />
          </div>
        </form>
      </section>
      )}

      {generationToast && (
        <GenerationToast
          key={generationToast.id}
          message={generationToast.message}
          onClose={() => setGenerationToast(null)}
        />
      )}

      {isScheduleViewMode && initialized && !generated && sharedLoadError && (
        <section className="no-print mb-3 rounded-xl border border-[#f5c6c6] bg-[#fff5f5] p-4">
          <p className="m-0 text-sm font-semibold text-[#c0392b]">공유 대진표를 불러오지 못했습니다.</p>
          <p className="m-0 mt-1 text-sm text-[var(--muted)]">{sharedLoadError}</p>
          <Link href="/" className="btn btn-primary mt-3 inline-flex">
            나도 생성하기
          </Link>
        </section>
      )}

      {isScheduleViewMode && generated && (
        <section className="schedule-view-toolbar no-print mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
          <ScheduleExportActions
            className="schedule-view-toolbar__exports"
            onShare={handleShare}
            onImageDownload={handleImageDownload}
            onExcelDownload={handleExcelDownload}
            onPrint={handlePrint}
            isExporting={isExporting}
            isExcelExporting={isExcelExporting}
            isPrintExporting={isPrintExporting}
          />
          <Link
            href="/"
            className="btn btn-primary schedule-view-toolbar__create"
            onClick={() => trackEvent("나도 생성하기")}
          >
            나도 생성하기
          </Link>
        </section>
      )}

      {generated && (
        <div
          ref={exportRef}
          className={`screen-only ${resultsPulse ? "generation-results-pulse" : ""}`}
        >
          {!isScheduleViewMode && (
            <CollapsibleSection
              title="참가자별 경기 횟수"
              className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5"
              onOpenChange={trackMatchCountSectionToggle}
            >
              <PlayerMatchCountSummary
                stats={generated.playerStats}
                males={generated.males}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </CollapsibleSection>
          )}

          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="mb-0 text-[1.1rem] font-semibold">생성된 대진표</h2>
              {eventId && (
                <button
                  type="button"
                  className="btn btn-primary btn-compact shrink-0"
                  onClick={() => {
                    trackEvent("선수등록");
                    setRegistrationOpen(true);
                  }}
                >
                  선수등록
                </button>
              )}
            </div>
            <PlayerHighlightChips
              players={highlightPlayers}
              selectedPlayer={highlightedPlayer}
              onSelect={handleHighlightPlayer}
              mode={generated.mode}
              teamInfo={generated.teamInfo}
              males={generated.males}
            />
            {courtCount > 1 && (
              <div className="export-exclude mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {courtFilterOptions.map(({ value, label }) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setCourtFilter(value)}
                      className={`rounded-full border px-3 py-1.5 text-[0.86rem] ${getFilterChipClass(courtFilter === value)}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="min-w-[90px] p-2 text-left text-sm font-semibold text-[var(--muted)]">
                      시간
                    </th>
                    {visibleCourts.map((court) => (
                      <th
                        key={court}
                        className="min-w-[160px] p-2 text-left text-sm font-semibold text-[var(--muted)]"
                      >
                        코트{court}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...slotMap.entries()].map(([time, list]) => {
                    const isRest =
                      highlightActive &&
                      isRestSlotForPlayer(list, highlightedPlayer, visibleCourts);

                    if (isRest) {
                      return (
                        <tr key={time} className="border-b border-[var(--line)] bg-[#f8fafc]">
                          <th className="schedule-desktop-time p-2 text-left text-sm font-semibold text-[var(--muted)]">
                            {time}
                          </th>
                          <td colSpan={visibleCourts.length} className="schedule-desktop-cell p-2 align-middle">
                            <RestTimeView />
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={time} className="border-b border-[var(--line)]">
                        <th className="schedule-desktop-time p-2 text-left text-sm font-semibold">{time}</th>
                        {visibleCourts.map((court) => {
                          const match = list.find((x) => x.court === court);
                          return (
                            <td key={court} className="schedule-desktop-cell p-2 align-middle">
                              <ScheduleSlotCell
                                className="p-1"
                                time={time}
                                court={court}
                                match={match}
                                teamInfo={generated.teamInfo}
                                highlightedPlayer={highlightActive ? highlightedPlayer : null}
                                score={getScoreForSlot(matchScores, time, court)}
                                manualMode={isManualMode}
                                onEditScore={handleEditScore}
                                onEditManual={handleEditManual}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-2.5 md:hidden">
              <MobileScheduleByTime
                slots={[...slotMap.entries()]}
                visibleCourts={visibleCourts}
                teamInfo={generated.teamInfo}
                highlightedPlayer={highlightedPlayer}
                highlightActive={highlightActive}
                matchScores={matchScores}
                manualMode={isManualMode}
                onEditScore={handleEditScore}
                onEditManual={handleEditManual}
              />
            </div>
          </section>

          {showScoreRankings && (
            <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
              <p className="mb-2 text-xs font-semibold text-[var(--muted)]">점수 합산</p>
              {teamScoreTotals.length > 0 && (
                <TeamScoreSummary teams={teamScoreTotals} allMatchesComplete={allMatchesScored} />
              )}
              <PlayerScoreRanking
                groups={playerScoreRankingGroups}
                males={generated.males}
                teamMode={isTeamStyleSchedule(generated)}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </section>
          )}

          {showDoubleFaultStats && (
            <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
              <p className="mb-2 text-xs font-semibold text-[var(--muted)]">더블폴트 통계</p>
              <PlayerDoubleFaultStats
                groups={doubleFaultGroups}
                males={generated.males}
                teamMode={isTeamStyleSchedule(generated)}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </section>
          )}

          {isScheduleViewMode && (
            <CollapsibleSection
              title="참가자별 경기 횟수"
              className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5"
              onOpenChange={trackMatchCountSectionToggle}
            >
              <PlayerMatchCountSummary
                stats={generated.playerStats}
                males={generated.males}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </CollapsibleSection>
          )}

          <CollapsibleSection
            title="참가자별 페어/상대 통계"
            className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5"
            onOpenChange={trackPairStatsSectionToggle}
          >
            <PlayerStatsBars
              stats={generated.playerStats}
              males={generated.males}
              mode={generated.mode}
              teamInfo={generated.teamInfo}
              highlightedPlayer={highlightedPlayer}
              onHighlightPlayer={handleHighlightPlayer}
            />
          </CollapsibleSection>
        </div>
      )}

      {generated && (
        <div ref={printExportRef} className="print-only hidden" aria-hidden>
          <div className="print-content">
            <header className="print-header">
              <h1 className="print-title">
                {isTeamStyleSchedule(generated)
                  ? "테니스 팀전 대진표"
                  : generated.mode === "manual"
                    ? "테니스 대진표 (수동)"
                    : "테니스 대진표"}
              </h1>
              <p className="print-meta">
                {input.startTime} ~ {input.endTime} · 코트 {input.courtCount} · 경기 {input.matchMinutes}분
              </p>
              {teamSummary ? (
                <p className="print-meta">{teamSummary}</p>
              ) : (
                <p className="print-meta">
                  남 {input.maleCount} / 여 {input.femaleCount}
                </p>
              )}
              <p className="print-participants">
                {isTeamStyleSchedule(generated) && generated.teamInfo ? (
                  <>
                    <span>
                      <strong>{generated.teamInfo.teamAName}</strong>{" "}
                      {generated.teamInfo.teamAMales.length > 0 && (
                        <>남 {generated.teamInfo.teamAMales.join(", ")}</>
                      )}
                      {generated.teamInfo.teamAMales.length > 0 &&
                        generated.teamInfo.teamAFemales.length > 0 &&
                        " · "}
                      {generated.teamInfo.teamAFemales.length > 0 && (
                        <>여 {generated.teamInfo.teamAFemales.join(", ")}</>
                      )}
                    </span>
                    <span className="print-participants-sep"> / </span>
                    <span>
                      <strong>{generated.teamInfo.teamBName}</strong>{" "}
                      {generated.teamInfo.teamBMales.length > 0 && (
                        <>남 {generated.teamInfo.teamBMales.join(", ")}</>
                      )}
                      {generated.teamInfo.teamBMales.length > 0 &&
                        generated.teamInfo.teamBFemales.length > 0 &&
                        " · "}
                      {generated.teamInfo.teamBFemales.length > 0 && (
                        <>여 {generated.teamInfo.teamBFemales.join(", ")}</>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    {generated.males.length > 0 && (
                      <span>
                        <strong>남</strong> {generated.males.join(", ")}
                      </span>
                    )}
                    {generated.males.length > 0 && generated.females.length > 0 && (
                      <span className="print-participants-sep"> · </span>
                    )}
                    {generated.females.length > 0 && (
                      <span>
                        <strong>여</strong> {generated.females.join(", ")}
                      </span>
                    )}
                  </>
                )}
              </p>
            </header>

            <section className="print-block">
              <h2 className="print-heading">대진표</h2>
              <table className="print-table print-schedule-table">
                <thead>
                  <tr>
                    <th>시간</th>
                    {Array.from({ length: courtCount }, (_, i) => (
                      <th key={i}>코트{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...slotMap.entries()].map(([time, list]) => (
                    <tr key={time}>
                      <th className="print-time-cell">{time}</th>
                      {Array.from({ length: courtCount }, (_, i) => {
                        const court = i + 1;
                        const match = list.find((x) => x.court === court);
                        return (
                          <td key={court}>
                            {match && !match.empty ? formatMatchText(match, generated.teamInfo) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="print-block">
              <h2 className="print-heading">참가자별 페어/상대 통계</h2>
              <PlayerStatsPrint
                stats={generated.playerStats}
                mode={generated.mode}
                teamInfo={generated.teamInfo}
              />
            </section>
          </div>
        </div>
      )}

      <ManualMatchSheet
        target={manualEditor}
        types={input.types}
        males={generated?.males ?? []}
        females={generated?.females ?? []}
        teamInfo={generated?.teamInfo}
        schedule={generated?.schedule ?? []}
        saving={manualSaving}
        onClose={() => setManualEditor(null)}
        onSave={handleManualSave}
        onClear={handleManualClear}
      />

      <MatchScoreSheet
        target={scoreEditor}
        teamInfo={generated?.teamInfo}
        initialScore={
          scoreEditor ? getScoreForSlot(matchScores, scoreEditor.time, scoreEditor.court) : undefined
        }
        saving={scoreSaving}
        onClose={() => setScoreEditor(null)}
        onSave={async (a, b, df) => {
          if (!scoreEditor) return;
          await saveScore(scoreEditor.time, scoreEditor.court, a, b, df);
        }}
        onClear={async () => {
          if (!scoreEditor) return;
          await clearScore(scoreEditor.time, scoreEditor.court);
        }}
      />

      <PlayerRegistrationSheet
        open={registrationOpen}
        input={input}
        saving={rosterSaving}
        onClose={() => setRegistrationOpen(false)}
        onSave={handleRegistrationSave}
      />
    </main>
  );
}
