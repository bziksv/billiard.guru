import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { authErrorResponse } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  getBracketFormatSettings,
  getResolvedParticipantRules,
  isBracketFormatSelectable,
  withTournamentFormatLabel,
} from "@/lib/bracket-formats/settings-server";
import { isPairFormat } from "@/lib/pair-tournament";
import { prisma } from "@/lib/prisma";
import {
  isTournamentBracketComplete,
  tournamentAdminInclude,
  type AdminTournament,
} from "@/lib/tournament-admin";
import {
  requireTournamentManageAccess,
  tournamentManageActorType,
} from "@/lib/tournament-manage";
import { assertTournamentFitsFormat } from "@/lib/tournament-participant-limit-server";
import { reopenTournamentIfBracketEmpty } from "@/lib/tournament-registration-server";
import {
  sanitizeTournamentTableStreams,
  tableStreamsToJson,
  validateTournamentTableStreams,
} from "@/lib/tournament-stream";
import {
  parseTournamentTableIds,
  validateTournamentTableIds,
} from "@/lib/tournament-table-pick";
import { tournamentUpdateSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireTournamentManageAccess(id);
    await reopenTournamentIfBracketEmpty(id);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: tournamentAdminInclude,
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const participantRules = await getResolvedParticipantRules(tournament.format);

    return NextResponse.json(
      await withTournamentFormatLabel({ ...tournament, participantRules }),
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить турнир" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session } = await requireTournamentManageAccess(id);
    const body = await request.json();
    const data = tournamentUpdateSchema.parse(body);

    if (data.format !== undefined) {
      const formatSettings = await getBracketFormatSettings(data.format);
      if (!isBracketFormatSelectable(formatSettings)) {
        return NextResponse.json(
          {
            error: formatSettings.maintenanceMode
              ? "Этот тип сетки на техобслуживании"
              : "Этот тип сетки отключён в настройках админки",
          },
          { status: 400 },
        );
      }
      await assertTournamentFitsFormat(data.format, id);
    }

    if (data.status === "ACTIVE") {
      const current = await prisma.tournament.findUnique({
        where: { id },
        include: {
          registrations: { where: { status: "CONFIRMED" } },
          teams: { where: { status: "CONFIRMED" } },
        },
      });
      if (!current) {
        return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
      }
      if (current.status !== "OPEN") {
        return NextResponse.json(
          { error: "Начать можно только турнир с открытой регистрацией" },
          { status: 400 },
        );
      }
      const count = isPairFormat(current.format)
        ? current.teams.length
        : current.registrations.length;
      if (count < 2) {
        return NextResponse.json(
          { error: "Нужно минимум 2 подтверждённых участника" },
          { status: 400 },
        );
      }
    }

    if (data.status === "FINISHED") {
      const current = await prisma.tournament.findUnique({
        where: { id },
        include: tournamentAdminInclude,
      });
      if (!current) {
        return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
      }
      if (current.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Завершить можно только идущий турнир" },
          { status: 400 },
        );
      }
      if (!isTournamentBracketComplete(current as AdminTournament)) {
        return NextResponse.json(
          { error: "Сначала разыграйте все встречи сетки" },
          { status: 400 },
        );
      }
    }

    const currentForTables =
      data.tableIds !== undefined || data.tableStreams !== undefined
        ? await prisma.tournament.findUnique({
            where: { id },
            include: { club: { select: { floorPlan: true, tableCounts: true } } },
          })
        : null;

    let tableIdsUpdate: string[] | undefined;
    let tableStreamsUpdate: ReturnType<typeof tableStreamsToJson> | undefined;
    let removedTableIds: string[] = [];

    if (data.tableIds !== undefined || data.tableStreams !== undefined) {
      if (!currentForTables) {
        return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
      }
      const nextTableIds =
        data.tableIds ?? parseTournamentTableIds(currentForTables.tableIds);
      const tableError = validateTournamentTableIds(
        nextTableIds,
        currentForTables.club.floorPlan,
        currentForTables.club.tableCounts,
      );
      if (tableError) {
        return NextResponse.json({ error: tableError }, { status: 400 });
      }
      const streamsError = validateTournamentTableStreams(
        nextTableIds,
        data.tableStreams ??
          (currentForTables.tableStreams as Record<string, string> | undefined),
      );
      if (streamsError) {
        return NextResponse.json({ error: streamsError }, { status: 400 });
      }
      const sanitizedStreams = sanitizeTournamentTableStreams(
        nextTableIds,
        data.tableStreams ?? currentForTables.tableStreams,
      );
      tableIdsUpdate = nextTableIds;
      tableStreamsUpdate = tableStreamsToJson(sanitizedStreams);
      if (data.tableIds !== undefined) {
        const prevIds = parseTournamentTableIds(currentForTables.tableIds);
        removedTableIds = prevIds.filter((tid) => !nextTableIds.includes(tid));
      }
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.clubId !== undefined && { clubId: data.clubId }),
        ...(data.format !== undefined && { format: data.format }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startsAt !== undefined && {
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
        }),
        ...(data.clearRatingLimit === true && { ratingMax: null }),
        ...(data.ratingMax !== undefined &&
          data.clearRatingLimit !== true && { ratingMax: data.ratingMax }),
        ...(data.handicapHalfStep !== undefined && {
          handicapHalfStep: data.handicapHalfStep,
        }),
        ...(data.ratingSource !== undefined && { ratingSource: data.ratingSource }),
        ...(data.suppressNotifications !== undefined && {
          suppressNotifications: data.suppressNotifications,
        }),
        ...(tableIdsUpdate !== undefined && { tableIds: tableIdsUpdate }),
        ...(tableIdsUpdate !== undefined || data.tableStreams !== undefined
          ? { tableStreams: tableStreamsUpdate ?? null }
          : {}),
      } as Prisma.TournamentUncheckedUpdateInput,
      include: tournamentAdminInclude,
    });

    if (removedTableIds.length > 0) {
      await prisma.tournamentMatch.updateMany({
        where: {
          tournamentId: id,
          tableId: { in: removedTableIds },
          status: { not: "FINISHED" },
        },
        data: { tableId: null },
      });
    }

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action:
        data.status === "ACTIVE"
          ? "tournament.start"
          : data.status === "FINISHED"
            ? "tournament.finish"
            : "tournament.update",
      entityType: "tournament",
      entityId: id,
      payload: data,
    });

    return NextResponse.json(
      await withTournamentFormatLabel({
        ...tournament,
        participantRules: await getResolvedParticipantRules(tournament.format),
      }),
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.message !== "Турнир не найден") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось обновить турнир" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session } = await requireTournamentManageAccess(id);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    await prisma.tournament.delete({ where: { id } });

    await writeAuditLog({
      actorType: tournamentManageActorType(session),
      actorId: session.playerId,
      action: "tournament.delete",
      entityType: "tournament",
      entityId: id,
      payload: { name: tournament.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить турнир" }, { status: 500 });
  }
}
