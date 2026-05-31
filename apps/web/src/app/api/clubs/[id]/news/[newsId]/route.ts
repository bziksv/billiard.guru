import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; newsId: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id, newsId } = await params;

    const item = await prisma.clubNews.findFirst({
      where: { id: newsId, clubId: id },
    });
    if (!item) {
      return NextResponse.json({ error: "Новость не найдена" }, { status: 404 });
    }

    await prisma.clubNews.delete({ where: { id: newsId } });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "club.news.delete",
      entityType: "club_news",
      entityId: newsId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
