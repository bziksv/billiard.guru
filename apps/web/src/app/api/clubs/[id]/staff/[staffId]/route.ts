import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { requireClubOwnerOnly } from "@/lib/club-staff";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string; staffId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId, staffId } = await params;
    const { player: actor, club } = await requireClubManageAccess(clubId);

    const ownerError = requireClubOwnerOnly(club, actor);
    if (ownerError) {
      return NextResponse.json({ error: ownerError }, { status: 403 });
    }

    const row = await prisma.clubStaff.findFirst({
      where: { id: staffId, clubId },
    });
    if (!row) {
      return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
    }

    await prisma.clubStaff.delete({ where: { id: staffId } });

    if (actor?.id) {
      await writeAuditLog({
        actorType: "club",
        actorId: actor.id,
        action: "club_staff.remove",
        entityType: "club_staff",
        entityId: staffId,
        section: "staff",
        clubId,
        summary: "Сотрудник удалён из доступа",
        payload: { playerId: row.playerId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить сотрудника" }, { status: 500 });
  }
}
