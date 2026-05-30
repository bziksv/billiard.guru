import { NextResponse } from "next/server";
import { getCurrentPlayer, getSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      middleName: player.middleName,
      phone: player.phone,
      role: player.role,
      rating: player.rating,
      city: player.city.nameRu,
      country: player.city.country.nameRu,
      telegramUsername: player.telegramUsername,
    },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
