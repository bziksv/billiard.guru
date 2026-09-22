import { NextRequest, NextResponse } from "next/server";
import { startCallAuthByPhone } from "@/lib/auth-call-flow";
import { parseApiLocale } from "@/lib/phone-api-error";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit(`auth:start-call:${ip}`, {
      limit: 15,
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

    const { phone, countryName, locale: localeRaw } = await request.json();
    const locale = parseApiLocale(localeRaw);
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const result = await startCallAuthByPhone(
      String(phone),
      countryName ? String(countryName) : undefined,
      locale,
    );
    if ("error" in result) {
      return NextResponse.json(
        {
          error: result.error,
          errorCode: result.errorCode,
          errorParams: result.errorParams,
        },
        { status: result.status ?? 400 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Не удалось начать вход звонком" }, { status: 500 });
  }
}
