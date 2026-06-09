"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  generateSchedule,
  isCurrentSlot,
  matchToText,
  validateInput,
} from "@/lib/schedule";
import {
  exportElementAsImage,
  exportPrintLayoutAsLandscapeImage,
  isMobileDevice,
} from "@/lib/export-image";
import { PlayerStatsBars } from "@/components/player-stats-bars";
import { PlayerStatsPrint } from "@/components/player-stats-print";
import { ScheduleMatchView } from "@/components/schedule-match-view";
import { getFilterChipClass } from "@/lib/match-theme";
import type { CourtFilter, GeneratedSchedule, MatchType, ScheduleInput } from "@/lib/types";

const DEFAULT_INPUT: ScheduleInput = {
  maleCount: 0,
  femaleCount: 0,
  maleNames: [],
  femaleNames: [],
  courtCount: 1,
  startTime: "09:00",
  endTime: "11:00",
  matchMinutes: 30,
  types: ["WD"],
};

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

const TYPE_OPTIONS: { value: MatchType; label: string }[] = [
  { value: "MD", label: "남자복식 (MD)" },
  { value: "WD", label: "여자복식 (WD)" },
  { value: "MXD", label: "혼합복식 (MXD)" },
];

function resizeNames(names: string[], count: number): string[] {
  if (count <= names.length) return names.slice(0, count);
  return [...names, ...Array.from({ length: count - names.length }, () => "")];
}

function parseInputFromSearchParams(params: URLSearchParams): { input: ScheduleInput; seed: number } {
  const input: ScheduleInput = { ...DEFAULT_INPUT };
  const m = params.get("m");
  const f = params.get("f");
  const c = params.get("c");
  const s = params.get("s");
  const e = params.get("e");
  const d = params.get("d");
  const t = params.get("t");
  const seedParam = params.get("seed");

  if (m) input.maleCount = Number(m);
  if (f) input.femaleCount = Number(f);
  if (c) input.courtCount = Number(c);
  if (s) input.startTime = s;
  if (e) input.endTime = e;
  if (d) input.matchMinutes = Number(d);
  if (t) input.types = t.split(",").filter(Boolean) as MatchType[];

  const mn = params.get("mn");
  const fn = params.get("fn");
  if (mn) input.maleNames = mn.split("|");
  if (fn) input.femaleNames = fn.split("|");
  input.maleNames = resizeNames(input.maleNames, input.maleCount);
  input.femaleNames = resizeNames(input.femaleNames, input.femaleCount);

  const seed = seedParam ? Number(seedParam) : Date.now();
  return { input, seed };
}

export function TournamentGenerator() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState<ScheduleInput>(DEFAULT_INPUT);
  const [seed, setSeed] = useState(Date.now());
  const [generated, setGenerated] = useState<GeneratedSchedule | null>(null);
  const [courtFilter, setCourtFilter] = useState<CourtFilter>("ALL");
  const [initialized, setInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrintExporting, setIsPrintExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const printExportRef = useRef<HTMLDivElement>(null);

  const runGenerate = useCallback((nextInput: ScheduleInput, nextSeed: number) => {
    const error = validateInput(nextInput);
    if (error) {
      alert(error);
      return;
    }
    setInput(nextInput);
    setSeed(nextSeed);
    setCourtFilter("ALL");
    setGenerated(generateSchedule(nextInput, nextSeed));
  }, []);

  useEffect(() => {
    if (initialized) return;
    const { input: parsedInput, seed: parsedSeed } = parseInputFromSearchParams(searchParams);
    setInput(parsedInput);
    if (!validateInput(parsedInput)) {
      runGenerate(parsedInput, parsedSeed);
    }
    setInitialized(true);
  }, [initialized, runGenerate, searchParams]);

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

  const filteredSchedule = useMemo(
    () => schedule.filter((item) => courtFilter === "ALL" || item.court === courtFilter),
    [schedule, courtFilter]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runGenerate(input, Date.now());
  };

  const handleRegenerate = () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }
    runGenerate(input, Date.now());
  };

  const handleShare = async () => {
    if (!generated) return;
    const q = new URLSearchParams({
      m: String(input.maleCount),
      f: String(input.femaleCount),
      c: String(input.courtCount),
      s: input.startTime,
      e: input.endTime,
      d: String(input.matchMinutes),
      t: input.types.join(","),
      seed: String(seed),
    });
    if (input.maleNames.some((n) => n.trim())) {
      q.set("mn", input.maleNames.join("|"));
    }
    if (input.femaleNames.some((n) => n.trim())) {
      q.set("fn", input.femaleNames.join("|"));
    }
    const url = `${window.location.origin}?${q.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("공유 링크를 복사했습니다.");
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  const handleImageDownload = async () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }
    if (!exportRef.current) return;

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

  const handlePrint = async () => {
    if (!generated) {
      alert("먼저 대진을 생성해주세요.");
      return;
    }

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
      return { ...prev, types };
    });
  };

  const handleStartTimeChange = (startTime: string) => {
    setInput((prev) => ({
      ...prev,
      startTime,
      endTime: addHoursToTime(startTime, 2),
    }));
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

  return (
    <main className="mx-auto w-full max-w-[1120px] p-4">
      <header className="no-print mb-3">
        <h1 className="mb-2 text-[1.4rem] font-bold">테니스 대진표 자동 생성기</h1>
      </header>

      <section className="no-print mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
        <h2 className="mb-3 text-[1.1rem] font-semibold">대진 생성 조건</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-[0.92rem]">남성 인원수</span>
            <input
              type="number"
              min={0}
              required
              value={input.maleCount}
              onChange={(e) => handleMaleCountChange(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[0.92rem]">여성 인원수</span>
            <input
              type="number"
              min={0}
              required
              value={input.femaleCount}
              onChange={(e) => handleFemaleCountChange(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[0.92rem]">코트 수</span>
            <input
              type="number"
              min={1}
              required
              value={input.courtCount}
              onChange={(e) => setInput((prev) => ({ ...prev, courtCount: Number(e.target.value) }))}
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5"
            />
          </label>
          {input.maleCount > 0 && (
            <div className="col-span-full rounded-lg border border-[var(--line)] bg-[#f8fafc] px-3 py-2.5">
              <p className="mb-2 text-sm font-medium">남성 이름 (미입력 시 남1, 남2...)</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: input.maleCount }, (_, i) => (
                  <label key={`male-name-${i}`}>
                    <span className="mb-1 block text-xs text-[var(--muted)]">남{i + 1}</span>
                    <input
                      type="text"
                      value={input.maleNames[i] ?? ""}
                      placeholder={`남${i + 1}`}
                      onChange={(e) => handleMaleNameChange(i, e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          {input.femaleCount > 0 && (
            <div className="col-span-full rounded-lg border border-[var(--line)] bg-[#f8fafc] px-3 py-2.5">
              <p className="mb-2 text-sm font-medium">여성 이름 (미입력 시 여1, 여2...)</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: input.femaleCount }, (_, i) => (
                  <label key={`female-name-${i}`}>
                    <span className="mb-1 block text-xs text-[var(--muted)]">여{i + 1}</span>
                    <input
                      type="text"
                      value={input.femaleNames[i] ?? ""}
                      placeholder={`여${i + 1}`}
                      onChange={(e) => handleFemaleNameChange(i, e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          <label>
            <span className="mb-1.5 block text-[0.92rem]">시작시간</span>
            <input
              type="time"
              required
              value={input.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[0.92rem]">종료시간</span>
            <input
              type="time"
              required
              value={input.endTime}
              onChange={(e) => setInput((prev) => ({ ...prev, endTime: e.target.value }))}
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[0.92rem]">경기시간(분)</span>
            <input
              type="number"
              min={10}
              step={5}
              required
              value={input.matchMinutes}
              onChange={(e) => setInput((prev) => ({ ...prev, matchMinutes: Number(e.target.value) }))}
              className="w-full rounded-lg border border-[var(--line)] px-2.5 py-2.5"
            />
          </label>

          <fieldset className="col-span-full rounded-lg border border-[var(--line)] px-3 py-2.5">
            <legend className="px-1 text-[var(--muted)]">경기 유형</legend>
            {TYPE_OPTIONS.map(({ value, label }) => (
              <label key={value} className="my-1.5 block">
                <input
                  type="checkbox"
                  checked={input.types.includes(value)}
                  onChange={() => toggleType(value)}
                  className="mr-2"
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="col-span-full grid grid-cols-5 gap-1.5">
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-1.5 py-2.5 text-sm font-semibold whitespace-nowrap text-[var(--primary-foreground)]"
            >
              대진 생성
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className="rounded-lg border border-[var(--line)] bg-white px-1.5 py-2.5 text-sm font-semibold whitespace-nowrap"
            >
              다시 생성
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-lg border border-[var(--line)] bg-white px-1.5 py-2.5 text-sm font-semibold whitespace-nowrap"
            >
              링크 복사
            </button>
            <button
              type="button"
              onClick={handleImageDownload}
              disabled={isExporting || isPrintExporting}
              className="rounded-lg border border-[var(--line)] bg-white px-1.5 py-2.5 text-sm font-semibold whitespace-nowrap disabled:opacity-60"
            >
              {isExporting ? "저장 중" : "저장"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting || isPrintExporting}
              className="rounded-lg border border-[var(--line)] bg-white px-1.5 py-2.5 text-sm font-semibold whitespace-nowrap disabled:opacity-60"
            >
              {isPrintExporting ? "인쇄 중" : "인쇄"}
            </button>
          </div>
        </form>
      </section>

      {generated && (
        <div ref={exportRef} className="screen-only">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
            <h2 className="mb-3 text-[1.1rem] font-semibold">생성된 대진표</h2>
            <div className="export-exclude mb-3 flex flex-wrap gap-1.5">
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

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="min-w-[90px] p-2 text-left text-sm font-semibold text-[var(--muted)]">
                      시간
                    </th>
                    {visibleCourts.map((court) => (
                      <th key={court} className="min-w-[160px] p-2 text-left text-sm font-semibold text-[var(--muted)]">
                        코트{court}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...slotMap.entries()].map(([time, list]) => {
                    const current = isCurrentSlot(time, input.matchMinutes);
                    return (
                      <tr key={time} className={current ? "bg-[var(--highlight)]" : "border-b border-[var(--line)]"}>
                        <th className="p-2 text-left text-sm font-semibold">{time}</th>
                        {visibleCourts.map((court) => {
                          const match = list.find((x) => x.court === court);
                          return (
                            <td key={court} className="p-2 align-middle">
                              <ScheduleMatchView match={match} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-2.5 grid gap-2 md:hidden">
              {filteredSchedule.map((item) => {
                const current = isCurrentSlot(item.time, input.matchMinutes);
                return (
                  <article
                    key={`${item.time}-${item.court}`}
                    className={`rounded-lg border border-[var(--line)] px-3 py-2 text-sm leading-snug ${
                      current ? "bg-[var(--highlight)]" : "bg-white"
                    }`}
                  >
                    {item.empty ? (
                      <p className="m-0 text-[var(--muted)]">
                        <span className="font-semibold text-[var(--text)]">{item.time}</span> · 코트{item.court} · 배정
                        실패
                      </p>
                    ) : (
                      <p className="m-0 text-[var(--text)]">
                        <span className="font-semibold">{item.time}</span>
                        {courtFilter === "ALL" && (
                          <span className="text-[var(--muted)]"> · 코트{item.court} · </span>
                        )}
                        {courtFilter !== "ALL" && <span className="text-[var(--muted)]"> · </span>}
                        <ScheduleMatchView match={item} inline />
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
            <h2 className="mb-2 text-[1.1rem] font-semibold">참가자별 페어/상대 통계</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">
              각 참가자의 총 경기수, 페어 횟수, 상대 만남 횟수를 막대 그래프로 표시합니다.
            </p>
            <PlayerStatsBars stats={generated.playerStats} />
          </section>
        </div>
      )}

      {generated && (
        <div ref={printExportRef} className="print-only hidden" aria-hidden>
          <div className="print-content">
            <header className="print-header">
              <h1 className="print-title">테니스 대진표</h1>
              <p className="print-meta">
                {input.startTime} ~ {input.endTime} · 코트 {input.courtCount} · 경기 {input.matchMinutes}분 · 남{" "}
                {input.maleCount} / 여 {input.femaleCount}
              </p>
              <p className="print-participants">
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
                            {match && !match.empty ? matchToText(match) : "-"}
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
              <PlayerStatsPrint stats={generated.playerStats} />
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
