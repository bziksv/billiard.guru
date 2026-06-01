import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  clearPreviewCookie,
  findPlayerForClub,
  previewCookieOptions,
  VIEW_AS_CLUB_COOKIE,
  VIEW_AS_PLAYER_COOKIE,
} from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const previewSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("player"), playerId: z.string().min(1) }),
  z.object({ mode: z.literal("club"), clubId: z.string().min(1) }),
  z.object({ mode: z.literal("clear") }),
]);

export async function GET() {
  try {
    const session = await requireSuperAdmin();
    const cookieStore = await cookies();
    const playerId = cookieStore.get(VIEW_AS_PLAYER_COOKIE)?.value ?? null;
    const clubId = cookieStore.get(VIEW_AS_CLUB_COOKIE)?.value ?? null;

    const [player, club] = await Promise.all([
      playerId ? prisma.player.findUnique({ where: { id: playerId } }) : null,
      clubId ? prisma.club.findUnique({ where: { id: clubId } }) : null,
    ]);

    return NextResponse.json({
      active: Boolean(playerId || clubId),
      playerId,
      clubId,
      player: player
        ? { id: player.id, name: `${player.lastName} ${player.firstName}` }
        : null,
      club: club ? { id: club.id, name: club.name } : null,
      realPlayerId: session.playerId,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = previewSchema.parse(await request.json());

    if (body.mode === "clear") {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(clearPreviewCookie(VIEW_AS_PLAYER_COOKIE));
      res.cookies.set(clearPreviewCookie(VIEW_AS_CLUB_COOKIE));
      return res;
    }

    if (body.mode === "player") {
      const player = await prisma.player.findUnique({ where: { id: body.playerId } });
      if (!player) {
        return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
      }
      const res = NextResponse.json({
        ok: true,
        redirect: "/cabinet",
        label: `${player.lastName} ${player.firstName}`,
      });
      res.cookies.set(previewCookieOptions(VIEW_AS_PLAYER_COOKIE, player.id));
      res.cookies.set(clearPreviewCookie(VIEW_AS_CLUB_COOKIE));
      return res;
    }

    const club = await prisma.club.findUnique({ where: { id: body.clubId } });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const ownerPlayer = await findPlayerForClub(club.id);
    const res = NextResponse.json({
      ok: true,
      redirect: `/cabinet/club/${club.id}`,
      label: club.name,
      ownerPlayer: ownerPlayer
        ? `${ownerPlayer.lastName} ${ownerPlayer.firstName}`
        : null,
    });
    res.cookies.set(previewCookieOptions(VIEW_AS_CLUB_COOKIE, club.id));
    if (ownerPlayer) {
      res.cookies.set(previewCookieOptions(VIEW_AS_PLAYER_COOKIE, ownerPlayer.id));
    } else {
      res.cookies.set(clearPreviewCookie(VIEW_AS_PLAYER_COOKIE));
    }
    return res;
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось включить режим просмотра" }, { status: 500 });
  }
}
