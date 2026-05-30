import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { tournamentUpdateSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const data = tournamentUpdateSchema.parse(body);

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
      include: {
        club: true,
        registrations: { include: { player: true } },
        teams: {
          include: { player1: true, player2: true, club: true },
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
      },
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "tournament.update",
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
