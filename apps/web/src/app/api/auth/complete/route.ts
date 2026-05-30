import { NextRequest, NextResponse } from "next/server";
import { completeLoginChallenge } from "@/lib/login-challenge";

export async function POST(request: NextRequest) {
  try {
    const { challengeToken } = await request.json();
    if (!challengeToken) {
      return NextResponse.json({ error: "Нет токена" }, { status: 400 });
    }

    const { cookie, player } = await completeLoginChallenge(challengeToken);

    const response = NextResponse.json({
      ok: true,
      role: player.role,
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
