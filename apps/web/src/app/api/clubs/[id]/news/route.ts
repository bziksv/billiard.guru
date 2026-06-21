import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getCurrentPlayer, getSession } from "@/lib/auth";
import { submitClubNewsForModeration } from "@/lib/club-news-moderation";
import { writeAuditLog } from "@/lib/audit";
import { playerCanManageClub } from "@/lib/club-staff";
import { prisma } from "@/lib/prisma";
import { clubNewsSchema } from "@/lib/validators";

function serializeNews(item: {
  id: string;
  title: string;
  body: string;
  titleEn?: string | null;
  bodyEn?: string | null;
  status: string;
  rejectReason: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  cityBroadcastRequested: boolean;
}) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    titleEn: item.titleEn ?? null,
    bodyEn: item.bodyEn ?? null,
    status: item.status,
    rejectReason: item.rejectReason,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    cityBroadcastRequested: item.cityBroadcastRequested,
  };
}

async function viewerCanManageClub(clubId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  if (session.role === "SUPERADMIN") return true;
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  const player = await getCurrentPlayer();
  if (!club || !player) return false;
  return playerCanManageClub(club, player);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id }, select: { id: true } });
  if (!club) {
    return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
  }

  const canManage = await viewerCanManageClub(id);

  const news = await prisma.clubNews.findMany({
    where: {
      clubId: id,
      ...(canManage ? {} : { status: "APPROVED" }),
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json(news.map(serializeNews));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const canManage = await viewerCanManageClub(id);
    if (!canManage) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const club = await prisma.club.findUnique({ where: { id }, select: { id: true } });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const data = clubNewsSchema.parse(await request.json());
    const item = await submitClubNewsForModeration({
      clubId: id,
      authorId: session.playerId,
      title: data.title,
      body: data.body,
      cityBroadcastRequested: data.cityBroadcastRequested,
    });

    await writeAuditLog({
      actorType: session.role === "SUPERADMIN" ? "admin" : "club",
      actorId: session.playerId,
      action: "club.news.submit",
      entityType: "club_news",
      entityId: item.id,
      section: "news",
      clubId: id,
      summary: `На модерацию: ${item.title}`,
    });

    return NextResponse.json(serializeNews(item), { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось создать новость" }, { status: 400 });
  }
}
