import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  clearPreviewCookie,
  findPlayerForClub,
  previewCookieOptions,
  signPreviewValue,
  verifyPreviewValue,
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
    const playerId = verifyPreviewValue(
      cookieStore.get(VIEW_AS_PLAYER_COOKIE)?.value,
      session.playerId,
    );
    const clubId = verifyPreviewValue(
      cookieStore.get(VIEW_AS_CLUB_COOKIE)?.value,
      session.playerId,
    );

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
      readOnly: true,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
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
        readOnly: true,
      });
      res.cookies.set(
        previewCookieOptions(
          VIEW_AS_PLAYER_COOKIE,
          signPreviewValue(player.id, session.playerId),
        ),
      );
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
      readOnly: true,
    });
    res.cookies.set(
      previewCookieOptions(VIEW_AS_CLUB_COOKIE, signPreviewValue(club.id, session.playerId)),
    );
    if (ownerPlayer) {
      res.cookies.set(
        previewCookieOptions(
          VIEW_AS_PLAYER_COOKIE,
          signPreviewValue(ownerPlayer.id, session.playerId),
        ),
      );
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
