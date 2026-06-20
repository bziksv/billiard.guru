import type { AnalyticsSurface } from "@/generated/prisma/client";
import { normalizeCountryFields } from "@/lib/analytics/geo";
import { prisma } from "@/lib/prisma";

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|headless/i;

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_RE.test(userAgent);
}

export function normalizeAnalyticsPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 512) return null;
  if (trimmed.startsWith("/api/")) return null;
  return trimmed;
}

export async function recordPageView(input: {
  visitorId: string;
  playerId?: string | null;
  surface: AnalyticsSurface;
  path: string;
  referrer?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
}) {
  const path = normalizeAnalyticsPath(input.path);
  if (!path) return null;

  const referrer =
    input.referrer && input.referrer.length <= 512 ? input.referrer : null;
  const country = normalizeCountryFields(input.countryCode);
  const countryCode = country?.countryCode ?? null;
  const countryName = country?.countryName ?? null;

  return prisma.sitePageView.create({
    data: {
      visitorId: input.visitorId,
      playerId: input.playerId ?? null,
      surface: input.surface,
      path,
      referrer,
      countryCode,
      countryName,
    },
  });
}
