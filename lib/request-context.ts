export type DeviceInfo = {
  device: "mobile" | "desktop" | "unknown";
  platform: "ios" | "android" | "other" | "unknown";
};

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function parseUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent || "";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { device: "mobile", platform: "ios" };
  }
  if (/Android/i.test(ua)) {
    return { device: "mobile", platform: "android" };
  }
  if (/Mobile/i.test(ua)) {
    return { device: "mobile", platform: "other" };
  }
  if (ua) {
    return { device: "desktop", platform: "other" };
  }

  return { device: "unknown", platform: "unknown" };
}
