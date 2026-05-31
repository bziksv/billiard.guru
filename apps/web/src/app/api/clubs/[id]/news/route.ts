import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { clubNewsSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id }, select: { id: true } });
  if (!club) {
    return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
  }

  const news = await prisma.clubNews.findMany({
    where: { clubId: id },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(news);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const data = clubNewsSchema.parse(await request.json());
    const item = await prisma.clubNews.create({
      data: {
        clubId: id,
        title: data.title,
        body: data.body,
        ...(data.publishedAt && { publishedAt: new Date(data.publishedAt) }),
      },
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "club.news.create",
      entityType: "club_news",
      entityId: item.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось создать новость" }, { status: 400 });
  }
}
