export interface MatchScore {
  a: number;
  b: number;
}

export type MatchScores = Record<string, MatchScore>;

export function normalizeTimeLabel(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function makeMatchKey(time: string, court: number): string {
  const normalizedTime = normalizeTimeLabel(time) ?? time;
  return `${normalizedTime}#${court}`;
}

/** 시트/API에서 온 키를 대진표 슬롯 키 형식으로 통일 */
export function normalizeMatchScores(scores: MatchScores): MatchScores {
  const normalized: MatchScores = {};

  for (const [rawKey, rawScore] of Object.entries(scores)) {
    const hash = rawKey.lastIndexOf("#");
    if (hash <= 0) continue;

    const time = normalizeTimeLabel(rawKey.slice(0, hash));
    const court = Number(rawKey.slice(hash + 1));
    if (!time || Number.isNaN(court)) continue;

    normalized[makeMatchKey(time, court)] = {
      a: Number(rawScore.a),
      b: Number(rawScore.b),
    };
  }

  return normalized;
}

export function parseMatchKey(key: string): { time: string; court: number } | null {
  const hash = key.lastIndexOf("#");
  if (hash <= 0) return null;
  const time = key.slice(0, hash);
  const court = Number(key.slice(hash + 1));
  if (!time || Number.isNaN(court)) return null;
  return { time, court };
}

export function getMatchWinner(score: MatchScore): "A" | "B" | "tie" | null {
  if (score.a > score.b) return "A";
  if (score.b > score.a) return "B";
  if (score.a === score.b) return "tie";
  return null;
}

export function formatMatchScore(score: MatchScore): string {
  return `${score.a} : ${score.b}`;
}

export function createEventId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const MAX_MATCH_SCORE = 6;
export const TIE_SCORE = 5;

export function isValidScoreValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_MATCH_SCORE;
}

export function isValidMatchScore(a: number, b: number): boolean {
  if (!isValidScoreValue(a) || !isValidScoreValue(b)) return false;
  if (a === b) return a === TIE_SCORE;
  return a === MAX_MATCH_SCORE || b === MAX_MATCH_SCORE;
}

export function getMatchScoreValidationError(a: number, b: number): string | null {
  if (!isValidScoreValue(a) || !isValidScoreValue(b)) {
    return `점수는 0~${MAX_MATCH_SCORE} 사이 정수여야 합니다.`;
  }
  if (isValidMatchScore(a, b)) return null;
  if (a === b) {
    return "5:5 동점만 입력할 수 있습니다.";
  }
  return "한 팀은 6점이어야 합니다.";
}
