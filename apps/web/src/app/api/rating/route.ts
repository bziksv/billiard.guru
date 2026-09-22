import { NextRequest, NextResponse } from "next/server";
import { sanitizePlayer } from "@/lib/api-sanitize";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { calculateRatingChange } from "@/lib/rating";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

/** Legacy rating adjust — SUPERADMIN only. Prefer match-driven rating apply. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const { winnerId, loserId, matchId } = await request.json();
    if (!winnerId || !loserId) {
      return NextResponse.json({ error: "winnerId и loserId обязательны" }, { status: 400 });
    }

    const [winner, loser] = await Promise.all([
      prisma.player.findUnique({ where: { id: winnerId } }),
      prisma.player.findUnique({ where: { id: loserId } }),
    ]);

    if (!winner || !loser) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const change = calculateRatingChange(winner.rating, loser.rating);

    const [updatedWinner, updatedLoser] = await prisma.$transaction([
      prisma.player.update({
        where: { id: winnerId },
        data: { rating: change.winnerNew },
      }),
      prisma.player.update({
        where: { id: loserId },
        data: { rating: change.loserNew },
      }),
      prisma.ratingChange.create({
        data: {
          playerId: winnerId,
          oldRating: winner.rating,
          newRating: change.winnerNew,
          delta: change.winnerDelta,
          reason: "match_win",
          matchId: matchId ?? null,
        },
      }),
      prisma.ratingChange.create({
        data: {
          playerId: loserId,
          oldRating: loser.rating,
          newRating: change.loserNew,
          delta: change.loserDelta,
          reason: "match_loss",
          matchId: matchId ?? null,
        },
      }),
    ]).then(([w, l]) => [w, l] as const);

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "rating.recalculate",
      entityType: "match",
      entityId: matchId,
      payload: {
        winnerId,
        loserId,
        winnerDelta: change.winnerDelta,
        loserDelta: change.loserDelta,
      },
    });

    return NextResponse.json({
      winner: sanitizePlayer(updatedWinner as unknown as Record<string, unknown>),
      loser: sanitizePlayer(updatedLoser as unknown as Record<string, unknown>),
      change,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Ошибка пересчёта" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const playerId = request.nextUrl.searchParams.get("playerId");
    if (!playerId) {
      return NextResponse.json({ error: "playerId обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        ratingHistory: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Не найден" }, { status: 404 });
    }

    return NextResponse.json(sanitizePlayer(player as unknown as Record<string, unknown>));
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить" }, { status: 500 });
  }
}
