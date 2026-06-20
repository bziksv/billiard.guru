import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { resolveVisitorCountry } from "@/lib/analytics/geo";
import { isLikelyBot, recordPageView } from "@/lib/analytics/track-pageview";
import { getOrCreateVisitorId, visitorCookieOptions } from "@/lib/analytics/visitor-cookie";

const bodySchema = z.object({
  path: z.string().min(1).max(512),
  surface: z.enum(["MARKETING", "ADMIN", "MANAGE"]),
  referrer: z.string().max(512).optional(),
  timezone: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent");
    if (isLikelyBot(userAgent)) {
      return new NextResponse(null, { status: 204 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const { id: visitorId, isNew } = await getOrCreateVisitorId();
    const session = await getSession();
    const country = await resolveVisitorCountry(request, parsed.data.timezone);

    await recordPageView({
      visitorId,
      playerId: session?.playerId ?? null,
      surface: parsed.data.surface,
      path: parsed.data.path,
      referrer: parsed.data.referrer ?? null,
      countryCode: country?.code ?? null,
      countryName: country?.name ?? null,
    });

    const response = new NextResponse(null, { status: 204 });
    if (isNew) {
      const opts = visitorCookieOptions(visitorId);
      response.cookies.set(opts);
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
