import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; newsId: string }> },
) {
  try {
    const { id, newsId } = await params;
    await requireClubManageAccess(id);
    const session = await getSession();

    const item = await prisma.clubNews.findFirst({
      where: { id: newsId, clubId: id },
    });
    if (!item) {
      return NextResponse.json({ error: "Новость не найдена" }, { status: 404 });
    }

    await prisma.clubNews.delete({ where: { id: newsId } });

    await writeAuditLog({
      actorType: session?.role === "SUPERADMIN" ? "admin" : "club",
      actorId: session!.playerId,
      action: "club.news.delete",
      entityType: "club_news",
      entityId: newsId,
      section: "news",
      clubId: id,
      summary: "Новость удалена",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
