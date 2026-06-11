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
import { PlayerScoreRanking } from "@/components/player-score-ranking";
import { TeamScoreSummary } from "@/components/team-score-summary";
import { MobileScheduleByTime } from "@/components/mobile-schedule-by-time";
import { PlayerHighlightChips } from "@/components/player-highlight-chips";
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
import { getScoreForSlot, ScorableMatchCell } from "@/components/scorable-match-cell";
import { createEventId } from "@/lib/match-scores";
import {
  areAllMatchesScored,
  computePlayerScoreTotals,
  hasRecordedScores,
} from "@/lib/player-score-totals";
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
import { typesNeedFemale, typesNeedMale } from "@/lib/match-type-gender";
import {
  addHoursToTime,
  DURATION_HOUR_OPTIONS,
  inferDurationHours,
  type DurationHours,
} from "@/lib/schedule-duration";
import type { CourtFilter, GeneratedSchedule, MatchType, ScheduleInput, ScheduleMode } from "@/lib/types";

const TYPE_OPTIONS: { value: MatchType; label: string }[] = [
  { value: "WD", label: "여자복식" },
  { value: "MD", label: "남자복식" },
  { value: "MXD", label: "혼합복식" },
];

const MODE_OPTIONS: { value: ScheduleMode; label: string }[] = [
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
  const [scoreEditor, setScoreEditor] = useState<ScoreEditorTarget | null>(null);
  const actionBtnRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const printExportRef = useRef<HTMLDivElement>(null);

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
      setGenerated(result);
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
    const { input: parsedInput, seed: parsedSeed } = parseInputFromSearchParams(searchParams);
    const parsedEventId = parseEventIdFromSearchParams(searchParams);
    setInput(parsedInput);
    setDurationHours(inferDurationHours(parsedInput.startTime, parsedInput.endTime));
    if (parsedEventId) {
      setEventId(parsedEventId);
    }
    if (searchParams.has("seed") && !validateInput(parsedInput)) {
      runGenerate(parsedInput, parsedSeed, undefined, parsedEventId);
    }
    setInitialized(true);
  }, [initialized, runGenerate, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    trackEvent("page_view", {
      shared: params.has("seed"),
      mode: params.get("mode") === "team" ? "team" : "free",
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
    trackEvent("다시 생성");
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

      if (prev.mode === "free") {
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
      if (mode !== "team") {
        return { ...prev, mode };
      }
      const teamDefaults = applyTeamRosterDefaultsForTypes(prev.teamA, prev.teamB, prev.types);
      return { ...prev, mode, ...teamDefaults };
    });
    setHighlightedPlayer(null);
    setGenerated(null);
  };

  const handleHighlightPlayer = (player: string | null) => {
    setHighlightedPlayer(player);
    if (player) trackEvent("내경기 하이라이트", { player });
  };

  const highlightPlayers = useMemo(
    () => generated?.playerStats.map((s) => s.player) ?? [],
    [generated?.playerStats]
  );

  const playerScoreRankings = useMemo(() => {
    if (!generated || !hasRecordedScores(matchScores)) return [];
    return computePlayerScoreTotals(generated.schedule, matchScores);
  }, [generated, matchScores]);

  const teamScoreTotals = useMemo(() => {
    if (!generated?.teamInfo || !hasRecordedScores(matchScores)) return [];
    return computeTeamScoreTotals(generated.schedule, matchScores, generated.teamInfo);
  }, [generated, matchScores]);

  const allMatchesScored = useMemo(() => {
    if (!generated) return false;
    return areAllMatchesScored(generated.schedule, matchScores);
  }, [generated, matchScores]);

  const isScheduleViewMode = searchParams.has("seed");

  const highlightActive = !!highlightedPlayer && !isExporting;

  const needsMale = input.types.includes("MD") || input.types.includes("MXD");
  const needsFemale = input.types.includes("WD") || input.types.includes("MXD");
  const maxCourtsHint = formatMaxCourtsHint(input);

  const matchCount = generated?.schedule.filter((m) => !m.empty).length ?? 0;
  const teamSummary =
    generated?.mode === "team" && generated.teamInfo
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
        <div className="mode-segmented mb-3">
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
          {input.mode === "free" ? (
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
              </div>
            )
          ) : (
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
              <p className="text-sm text-[var(--muted)]">
                팀 인원이 다르면 인원이 적은 팀 선수에게 경기가 더 많이 배정될 수 있습니다. 가능한 범위에서
                개인별 경기 수를 균등하게 맞춥니다.
              </p>
            </div>
          )}

          <div ref={actionBtnRef} className="action-btn-row col-span-full">
            <button
              type="submit"
              className={`btn btn-primary ${generateFlash === "create" ? "generation-btn-flash" : ""}`}
            >
              대진 생성
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className={`btn btn-secondary ${generateFlash === "regenerate" ? "generation-btn-flash" : ""}`}
            >
              다시 생성
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
            <section className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
              <p className="mb-2 text-xs font-semibold text-[var(--muted)]">경기 횟수</p>
              <PlayerMatchCountSummary
                stats={generated.playerStats}
                males={generated.males}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </section>
          )}

          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
            <h2 className="mb-1 text-[1.1rem] font-semibold">생성된 대진표</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">경기를 탭하면 점수를 입력할 수 있습니다.</p>
            <PlayerHighlightChips
              players={highlightPlayers}
              selectedPlayer={highlightedPlayer}
              onSelect={handleHighlightPlayer}
            />
            {courtCount > 1 && (
              <div className="export-exclude mb-3">
                <p className="mb-1.5 text-xs font-semibold text-[var(--muted)]">코트 보기</p>
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
                              <ScorableMatchCell
                                className="p-1"
                                time={time}
                                court={court}
                                match={match}
                                teamInfo={generated.teamInfo}
                                highlightedPlayer={highlightActive ? highlightedPlayer : null}
                                score={getScoreForSlot(matchScores, time, court)}
                                onEditScore={setScoreEditor}
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
                onEditScore={setScoreEditor}
              />
            </div>
          </section>

          {playerScoreRankings.length > 0 && (
            <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
              <p className="mb-2 text-xs font-semibold text-[var(--muted)]">점수 합산</p>
              {teamScoreTotals.length > 0 && (
                <TeamScoreSummary teams={teamScoreTotals} allMatchesComplete={allMatchesScored} />
              )}
              <PlayerScoreRanking
                rankings={playerScoreRankings}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </section>
          )}

          {isScheduleViewMode && (
            <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
              <p className="mb-2 text-xs font-semibold text-[var(--muted)]">경기 횟수</p>
              <PlayerMatchCountSummary
                stats={generated.playerStats}
                males={generated.males}
                highlightedPlayer={highlightedPlayer}
                onHighlightPlayer={handleHighlightPlayer}
              />
            </section>
          )}

          <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
            <h2 className="mb-3 text-[1.1rem] font-semibold">참가자별 페어/상대 통계</h2>
            <PlayerStatsBars
              stats={generated.playerStats}
              males={generated.males}
              mode={generated.mode}
              teamInfo={generated.teamInfo}
              highlightedPlayer={highlightedPlayer}
              onHighlightPlayer={handleHighlightPlayer}
            />
          </section>
        </div>
      )}

      {generated && (
        <div ref={printExportRef} className="print-only hidden" aria-hidden>
          <div className="print-content">
            <header className="print-header">
              <h1 className="print-title">
                {generated.mode === "team" ? "테니스 팀전 대진표" : "테니스 대진표"}
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
                {generated.mode === "team" && generated.teamInfo ? (
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

      <MatchScoreSheet
        target={scoreEditor}
        teamInfo={generated?.teamInfo}
        initialScore={
          scoreEditor ? getScoreForSlot(matchScores, scoreEditor.time, scoreEditor.court) : undefined
        }
        saving={scoreSaving}
        onClose={() => setScoreEditor(null)}
        onSave={async (a, b) => {
          if (!scoreEditor) return;
          await saveScore(scoreEditor.time, scoreEditor.court, a, b);
        }}
        onClear={async () => {
          if (!scoreEditor) return;
          await clearScore(scoreEditor.time, scoreEditor.court);
        }}
      />
    </main>
  );
}
