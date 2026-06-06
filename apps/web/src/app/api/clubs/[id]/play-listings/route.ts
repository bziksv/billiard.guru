import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { authErrorResponse, getSession } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import {
  computePlayListingExpiresAt,
  serializePlayListing,
} from "@/lib/play-listing-server";
import { loadClubPlayListingsManage } from "@/lib/play-listing-manage";
import { prisma } from "@/lib/prisma";
import { playListingListInclude } from "@/lib/public-queries";
import { playListingCreateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    await requireClubManageAccess(clubId);
    const payload = await loadClubPlayListingsManage(clubId);
    return NextResponse.json(payload);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить объявления" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clubId } = await params;
    const { player: actor, club } = await requireClubManageAccess(clubId);

    const session = await getSession();
    const authorId = actor?.id ?? session?.playerId;
    if (!authorId) {
      return NextResponse.json({ error: "Требуется профиль игрока" }, { status: 403 });
    }

    const raw = await request.json();
    const data = playListingCreateSchema.parse({
      ...raw,
      cityId: club.cityId,
      clubId,
    });

    const playAt = data.playAt ? new Date(data.playAt) : null;
    const expiresAt = computePlayListingExpiresAt({
      scheduleType: data.scheduleType,
      playAt,
    });

    const listing = await prisma.playListing.create({
      data: {
        authorId,
        cityId: club.cityId,
        clubId,
        publishedByClub: true,
        title: data.title.trim(),
        body: data.body?.trim() || null,
        kind: data.kind,
        scheduleType: data.scheduleType,
        playAt,
        weekdays: data.scheduleType === "RECURRING" ? data.weekdays : undefined,
        timeFrom: data.timeFrom || null,
        timeTo: data.timeTo || null,
        gameFormat: data.gameFormat || null,
        ratingMin: data.ratingMin ?? null,
        ratingMax: data.ratingMax ?? null,
        playersNeeded: data.playersNeeded,
        expiresAt,
      },
      include: playListingListInclude,
    });

    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    await writeAuditLog({
      action: "play_listing.manage.create",
      entityType: "play_listing",
      entityId: listing.id,
      actorType: session.role === "SUPERADMIN" ? "admin" : "club",
      actorId: session.playerId,
      section: "pokatat",
      clubId,
      summary: `Объявление клуба «${listing.title}»`,
      payload: { kind: listing.kind, scheduleType: listing.scheduleType },
    });

    return NextResponse.json(serializePlayListing(listing), { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Не удалось опубликовать объявление" }, { status: 500 });
  }
}
