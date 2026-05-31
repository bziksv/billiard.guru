import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { isPairFormat } from "@/lib/pair-tournament";
import { prisma } from "@/lib/prisma";
import { tournamentAdminInclude } from "@/lib/tournament-admin";
import { tournamentUpdateSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: tournamentAdminInclude,
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    return NextResponse.json(tournament);
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
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const data = tournamentUpdateSchema.parse(body);

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
      },
      include: tournamentAdminInclude,
    });

    await writeAuditLog({
      actorType: "admin",
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

    return NextResponse.json(tournament);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось обновить турнир" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    await prisma.tournament.delete({ where: { id } });

    await writeAuditLog({
      actorType: "admin",
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
