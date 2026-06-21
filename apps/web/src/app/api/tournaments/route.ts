import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { writeAuditLog } from "@/lib/audit";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { requestClubTournamentApproval } from "@/lib/tournament-approval";
import { validateTournamentTableIds } from "@/lib/tournament-table-pick";
import {
  sanitizeTournamentTableStreams,
  tableStreamsToJson,
  validateTournamentTableStreams,
} from "@/lib/tournament-stream";
import { tournamentSchema } from "@/lib/validators";
import { syncLocalizedDescription, syncLocalizedLabel } from "@/lib/translation";
import { withTournamentFormatLabels } from "@/lib/bracket-formats/settings-server";
import { ZodError } from "zod";

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
    return NextResponse.json(await withTournamentFormatLabels(tournaments));
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
    const body = await request.json();
    const data = tournamentSchema.parse(body);

    let actorType: "admin" | "player" = "player";
    let actorId: string;

    try {
      const session = await requireSuperAdmin();
      actorType = "admin";
      actorId = session.playerId;
    } catch (adminError) {
      const adminAuth = authErrorResponse(adminError);
      if (adminAuth?.status === 401) return adminAuth;
      const { player } = await requireClubManageAccess(data.clubId);
      if (!player) {
        return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
      }
      actorType = "player";
      actorId = player.id;
    }

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

    const suppressNotifications = data.suppressNotifications === true;

    const tableError = validateTournamentTableIds(
      data.tableIds,
      club.floorPlan,
      club.tableCounts,
    );
    if (tableError) {
      return NextResponse.json({ error: tableError }, { status: 400 });
    }

    const streamsError = validateTournamentTableStreams(data.tableIds, data.tableStreams);
    if (streamsError) {
      return NextResponse.json({ error: streamsError }, { status: 400 });
    }
    const tableStreams = sanitizeTournamentTableStreams(data.tableIds, data.tableStreams);
    const descriptionFields = await syncLocalizedDescription({
      description: data.description,
    });
    const nameFields = await syncLocalizedLabel({ text: data.name });

    const tournament = await prisma.tournament.create({
      data: {
        name: nameFields.text,
        nameEn: nameFields.textEn,
        description: descriptionFields.description,
        descriptionEn: descriptionFields.descriptionEn,
        clubId: data.clubId,
        format: data.format,
        status: suppressNotifications ? "OPEN" : "DRAFT",
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        ratingMax: data.ratingMax,
        ratingSource: data.ratingSource,
        handicapHalfStep: data.handicapHalfStep,
        suppressNotifications,
        tableIds: data.tableIds,
        tableStreams: tableStreamsToJson(tableStreams),
        publishedAt: suppressNotifications ? new Date() : null,
      },
      include: { club: { include: { city: true } } },
    });

    if (!suppressNotifications) {
      await requestClubTournamentApproval(tournament.id);
    }

    const updated = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      include: { club: { include: { city: true } } },
    });

    await writeAuditLog({
      actorType,
      actorId,
      action: "tournament.create",
      entityType: "tournament",
      entityId: tournament.id,
      section: "tournaments",
      clubId: data.clubId,
      summary: `Турнир «${data.name}»`,
      payload: {
        format: data.format,
        ratingMax: data.ratingMax,
        tableIds: data.tableIds,
        tableStreams,
        approvalSent: !suppressNotifications,
        suppressNotifications,
      },
    });

    const message = suppressNotifications
      ? "Турнир создан без уведомлений. Регистрация открыта."
      : actorType === "admin"
        ? "Турнир создан. Владельцу клуба отправлен запрос на публикацию в Telegram."
        : "Турнир создан. Подтвердите публикацию в Telegram, если пришёл запрос.";

    return NextResponse.json({ ...updated, message }, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Проверьте поля формы";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (error instanceof Error && error.message) {
      log.error({ error }, "Tournament create failed");
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    log.error({ error }, "Tournament create failed");
    return NextResponse.json({ error: "Не удалось создать турнир" }, { status: 500 });
  }
}
