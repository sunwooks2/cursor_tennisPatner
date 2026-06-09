export type TrackMeta = Record<string, string | number | boolean>;

export function trackEvent(event: string, meta?: TrackMeta): void {
  if (typeof window === "undefined") return;

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      pageUrl: window.location.href,
      referrer: document.referrer,
      meta,
      website: "",
    }),
    keepalive: true,
  }).catch(() => {});
}
