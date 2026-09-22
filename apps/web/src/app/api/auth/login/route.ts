import { NextRequest, NextResponse } from "next/server";
import { resolveAuthByPhone, toPublicAuthContinue } from "@/lib/auth-phone-flow";
import { normalizePhoneAuto } from "@/lib/phone";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

/** @deprecated Prefer POST /api/auth/start — kept for compatibility. */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit(`auth:login:${ip}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Слишком много попыток. Подождите и попробуйте снова." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const { phone, countryName } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const { error, result } = await resolveAuthByPhone(
      String(phone),
      countryName ? String(countryName) : undefined,
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Не удалось обработать запрос" }, { status: 500 });
    }

    const normalized = normalizePhoneAuto(
      String(phone),
      countryName ? String(countryName) : undefined,
    );
    return NextResponse.json(
      toPublicAuthContinue(result, normalized.e164 ?? null),
    );
  } catch {
    return NextResponse.json({ error: "Не удалось начать вход" }, { status: 500 });
  }
}
