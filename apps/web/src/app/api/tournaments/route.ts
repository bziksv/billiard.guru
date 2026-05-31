import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { requestClubTournamentApproval } from "@/lib/tournament-approval";
import { tournamentSchema } from "@/lib/validators";

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        club: { include: { city: { include: { country: true } } } },
        registrations: { include: { player: true } },
        teams: {
          include: {
            player1: true,
            player2: true,
            club: true,
          },
          orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        },
        matches: {
          include: {
            team1: { include: { player1: true, player2: true } },
            team2: { include: { player1: true, player2: true } },
            winnerTeam: { include: { player1: true, player2: true } },
          },
          orderBy: [{ round: "asc" }, { slot: "asc" }],
        },
        _count: { select: { registrations: true, teams: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tournaments);
  } catch (error) {
    console.error("GET /api/tournaments failed:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить турниры" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());
  try {
    const session = await requireSuperAdmin();
    const body = await request.json();
    const data = tournamentSchema.parse(body);

    const club = await prisma.club.findUnique({ where: { id: data.clubId } });
    if (!club?.isVerified || !club.telegramId) {
      return NextResponse.json(
        {
          error:
            "Клуб не подтверждён в Telegram. Владелец клуба должен сначала привязать бота.",
        },
        { status: 400 },
      );
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description || null,
        clubId: data.clubId,
        format: data.format,
        status: "DRAFT",
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
      },
      include: { club: { include: { city: true } } },
    });

    await requestClubTournamentApproval(tournament.id);

    const updated = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      include: { club: { include: { city: true } } },
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "tournament.create",
      entityType: "tournament",
      entityId: tournament.id,
      payload: { format: data.format, approvalSent: true },
    });

    return NextResponse.json(
      {
        ...updated,
        message:
          "Турнир создан. Владельцу клуба отправлен запрос на публикацию в Telegram.",
      },
      { status: 201 },
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    log.error({ error }, "Tournament create failed");
    return NextResponse.json({ error: "Не удалось создать турнир" }, { status: 500 });
  }
}
