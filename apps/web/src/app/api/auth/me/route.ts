import { NextResponse } from "next/server";
import { getCurrentPlayer, getRealPlayer, getSession } from "@/lib/auth";
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

  const realPlayer = await getRealPlayer();
  if (!realPlayer) {
    return NextResponse.json({ user: null });
  }

  // Preview UI may show impersonated identity, but session cookie must stay the real admin.
  const player = (await getCurrentPlayer()) ?? realPlayer;

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
      realRole: realPlayer.role,
      preview: player.id !== realPlayer.id,
    },
  });

  if (shouldRefreshSession(session) || realPlayer.role !== session.role) {
    const token = createSessionToken(realPlayer.id, realPlayer.role);
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
