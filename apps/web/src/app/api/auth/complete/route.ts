import { NextRequest, NextResponse } from "next/server";
import { completeLoginChallenge } from "@/lib/login-challenge";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = checkRateLimit(`auth:complete:${ip}`, {
      limit: 30,
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

    const { challengeToken } = await request.json();
    if (!challengeToken) {
      return NextResponse.json({ error: "Нет токена" }, { status: 400 });
    }

    const { cookie, player, needsTelegram } = await completeLoginChallenge(challengeToken);

    const response = NextResponse.json({
      ok: true,
      role: player.role,
      needsTelegram,
      registerAsClubOwner: player.registerAsClubOwner,
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        role: player.role,
      },
    });
    response.cookies.set(cookie);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось завершить вход";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
