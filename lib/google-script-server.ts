import type { MatchScores } from "@/lib/match-scores";
import type { EventRoster } from "@/lib/roster";

export function getGoogleScriptUrl(): string | null {
  return process.env.GOOGLE_SCRIPT_URL ?? null;
}

export type GoogleScriptResult = {
  ok: boolean;
  error?: string;
  scores?: MatchScores;
  roster?: EventRoster | string | null;
  schedule?: unknown;
};

export async function postToGoogleScript(
  payload: Record<string, unknown>
): Promise<GoogleScriptResult> {
  const scriptUrl = getGoogleScriptUrl();
  if (!scriptUrl) {
    return { ok: false, error: "missing_url" };
  }

  const body: Record<string, unknown> = { ...payload };
  if (process.env.FEEDBACK_SECRET) {
    body.secret = process.env.FEEDBACK_SECRET;
  }

  const res = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "follow",
  });

  const text = await res.text();
  let result: GoogleScriptResult = { ok: res.ok };
  try {
    result = JSON.parse(text) as GoogleScriptResult;
  } catch {
    // Apps Script may return non-JSON on success in some setups
  }

  if (!res.ok || result.ok === false) {
    return { ok: false, error: result.error ?? "script_failed" };
  }

  return result;
}
