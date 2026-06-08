import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import {
  allTournamentTableIds,
  buildTournamentTableGroups,
} from "@/lib/tournament-table-pick";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

async function authorizeClubTables(clubId: string) {
  try {
    await requireSuperAdmin();
    return;
  } catch (adminError) {
    const adminAuth = authErrorResponse(adminError);
    if (adminAuth?.status === 401) throw adminError;
    const { player } = await requireClubManageAccess(clubId);
    if (!player) {
      throw new Error("UNAUTHORIZED");
    }
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await authorizeClubTables(id);

    const club = await prisma.club.findUnique({
      where: { id },
      select: { tableCounts: true, floorPlan: true },
    });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const groups = buildTournamentTableGroups(club.floorPlan, club.tableCounts);
    return NextResponse.json({
      groups,
      total: allTournamentTableIds(groups).length,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    console.error("GET /api/clubs/[id]/tournament-tables failed:", error);
    return NextResponse.json({ error: "Не удалось загрузить столы" }, { status: 500 });
  }
}
