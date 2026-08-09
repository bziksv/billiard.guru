import { NextResponse } from "next/server";
import { getCurrentPlayer, getSession } from "@/lib/auth";
import {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
  shouldRefreshSession,
} from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ user: null });
  }

  const response = NextResponse.json({
    user: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      middleName: player.middleName,
      phone: player.phone,
      telegramId: player.telegramId,
      role: player.role,
      rating: player.rating,
      cityId: player.cityId,
      countryId: player.city.countryId,
      city: player.city.nameRu,
      country: player.city.country.nameRu,
      telegramUsername: player.telegramUsername,
    },
  });

  // Скользящая сессия: роль из БД (не устаревшая из cookie).
  if (shouldRefreshSession(session) || player.role !== session.role) {
    const token = createSessionToken(player.id, player.role);
    const cookie = sessionCookieOptions(token);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", clearSessionCookieOptions());
  return response;
}
