export function getGoogleScriptUrl(): string | null {
  return process.env.GOOGLE_SCRIPT_URL ?? null;
}

export async function postToGoogleScript(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
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
  let result: { ok?: boolean } = { ok: res.ok };
  try {
    result = JSON.parse(text) as { ok?: boolean };
  } catch {
    // Apps Script may return non-JSON on success in some setups
  }

  if (!res.ok || result.ok === false) {
    return { ok: false, error: "script_failed" };
  }

  return { ok: true };
}
