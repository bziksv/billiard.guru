import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getSession, requireSuperAdmin } from "@/lib/auth";
import { buildClubUpdateSummary, enrichClubAuditChanges } from "@/lib/audit-club-diff";
import { writeAuditLog } from "@/lib/audit";
import type { AuditSectionId } from "@/lib/audit-sections";
import { requireClubManageAccess } from "@/lib/club-manage";
import { clubCoordsIfAddressChanged } from "@/lib/club-geocode";
import { saveClubPhotoFile } from "@/lib/club-photo-upload";
import { ImageProcessingError } from "@/lib/image-processing";
import { parseClubGalleryUrls, syncClubPhotoFields } from "@/lib/club-photos";
import { floorPlanToJson, parseFloorPlan } from "@/lib/club-floor-plan";
import {
  clubTableCountsTotal,
  parseClubTableCounts,
  parseTableCountsForm,
  tableCountsToJson,
} from "@/lib/club-table-formats";
import {
  parsePriceTiers,
  parseWeeklyHours,
  priceTiersToJson,
  weeklyHoursToJson,
} from "@/lib/club-schedule";
import { jsonUpdateValue } from "@/lib/prisma-json";
import { prisma } from "@/lib/prisma";
import { buildClubLocalizedUpdate, clubLocalizedToPrisma } from "@/lib/translation";
import { buildClubLatinFields } from "@/lib/latin-names";
import { Prisma } from "@/generated/prisma/client";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { clubUpdateSchema } from "@/lib/validators";

function detectSectionFromBody(
  body: Record<string, unknown>,
  galleryOnly: boolean,
): AuditSectionId {
  if (galleryOnly) return "club";
  if (body.floorPlan !== undefined) return "floor";
  if (body.priceTiers !== undefined) return "tariffs";
  if (
    body.bookingEnabled !== undefined ||
    body.bookingSlotMinutes !== undefined ||
    body.bookingAdvanceDays !== undefined
  ) {
    return "bookings";
  }
  return "club";
}

async function logClubPatchAudit(
  clubId: string,
  session: { role: string; playerId: string },
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  section: AuditSectionId,
) {
  let { summary, changes } = buildClubUpdateSummary(existing, patch);
  changes = await enrichClubAuditChanges(changes, existing, patch);
  await writeAuditLog({
    actorType: session.role === "SUPERADMIN" ? "admin" : "club",
    actorId: session.playerId,
    action: "club.update",
    entityType: "club",
    entityId: clubId,
    section,
    clubId,
    summary,
    payload: { changes: JSON.parse(JSON.stringify(changes)) as Prisma.InputJsonValue },
  });
}

function parseJsonField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function tableCountsPayload(formData: FormData) {
  const counts = parseTableCountsForm(formData);
  const json = tableCountsToJson(counts);
  return {
    tableCounts: json,
    tableCount: json ? clubTableCountsTotal(counts) : null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      city: { include: { country: true } },
      news: { orderBy: { publishedAt: "desc" }, take: 20 },
      _count: { select: { tournaments: true } },
    },
  });
  if (!club) {
    return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
  }
  return NextResponse.json(club);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { player: actor } = await requireClubManageAccess(id);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const existing = await prisma.club.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let photoUrl = existing.photoUrl;
    let galleryList = parseClubGalleryUrls(existing.galleryUrls);
    if (galleryList.length === 0 && existing.photoUrl) {
      galleryList = [existing.photoUrl];
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const tables = tableCountsPayload(formData);
      const weeklyHoursParsed = parseWeeklyHours(parseJsonField(formData.get("weeklyHours")));
      const priceTiersParsed = parsePriceTiers(parseJsonField(formData.get("priceTiers")));
      const raw = {
        name: String(formData.get("name") ?? existing.name),
        cityId: String(formData.get("cityId") ?? existing.cityId),
        email: String(formData.get("email") ?? existing.email ?? ""),
        description: String(formData.get("description") ?? ""),
        address: String(formData.get("address") ?? ""),
        workingHours: String(formData.get("workingHours") ?? ""),
        gamePrice: String(formData.get("gamePrice") ?? ""),
        bookingEnabled: formData.get("bookingEnabled") ?? "1",
        bookingSlotMinutes: formData.get("bookingSlotMinutes") ?? "60",
        bookingAdvanceDays: formData.get("bookingAdvanceDays") ?? "14",
        displayPhone: String(formData.get("displayPhone") ?? ""),
      };

      const data = clubUpdateSchema.parse({
        name: raw.name,
        cityId: raw.cityId,
        email: raw.email || null,
        description: raw.description || null,
        address: raw.address || null,
        workingHours: raw.workingHours || null,
        gamePrice: raw.gamePrice || null,
        bookingEnabled: raw.bookingEnabled === "1" || raw.bookingEnabled === "true",
        bookingSlotMinutes: raw.bookingSlotMinutes === "" ? undefined : raw.bookingSlotMinutes,
        bookingAdvanceDays: raw.bookingAdvanceDays === "" ? undefined : raw.bookingAdvanceDays,
        displayPhone: raw.displayPhone || null,
      });

      let displayPhone: string | null | undefined = undefined;
      if (data.displayPhone !== undefined) {
        if (!data.displayPhone) {
          displayPhone = null;
        } else {
          const phoneResult = await normalizePhoneForCity(
            data.displayPhone,
            data.cityId ?? existing.cityId,
          );
          if (phoneResult.error) {
            return NextResponse.json({ error: phoneResult.error }, { status: 400 });
          }
          displayPhone = phoneResult.e164;
        }
      }

      const coords = await clubCoordsIfAddressChanged(existing, {
        address: data.address,
        cityId: data.cityId,
      });

      const galleryRaw = parseJsonField(formData.get("galleryUrls"));
      if (galleryRaw !== null) {
        galleryList = parseClubGalleryUrls(galleryRaw);
      }

      const photo = formData.get("photo");
      if (photo instanceof File && photo.size > 0) {
        const url = await saveClubPhotoFile(photo);
        galleryList = [...galleryList, url];
      }

      const syncedPhotos = syncClubPhotoFields(galleryList);
      photoUrl = syncedPhotos.photoUrl;
      const galleryJson = syncedPhotos.galleryUrls;

      const localizedFields = await buildClubLocalizedUpdate({
        ...(data.description !== undefined && { description: data.description }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
        ...(data.gamePrice !== undefined && { gamePrice: data.gamePrice }),
        priceTiers: priceTiersParsed,
      });

      const club = await prisma.club.update({
        where: { id },
        data: {
          ...(data.name !== undefined && {
            name: data.name,
            ...buildClubLatinFields(data.name),
          }),
          ...(data.cityId !== undefined && { cityId: data.cityId }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
          tableCount: tables.tableCount,
          tableCounts: jsonUpdateValue(tables.tableCounts),
          weeklyHours: jsonUpdateValue(weeklyHoursToJson(weeklyHoursParsed)),
          priceTiers: jsonUpdateValue(priceTiersToJson(priceTiersParsed)),
          ...(data.gamePrice !== undefined && { gamePrice: data.gamePrice }),
          ...clubLocalizedToPrisma(localizedFields),
          ...(data.bookingEnabled !== undefined && { bookingEnabled: data.bookingEnabled }),
          ...(data.bookingSlotMinutes !== undefined && {
            bookingSlotMinutes: data.bookingSlotMinutes,
          }),
          ...(data.bookingAdvanceDays !== undefined && {
            bookingAdvanceDays: data.bookingAdvanceDays,
          }),
          ...(displayPhone !== undefined && { displayPhone }),
          ...(coords !== undefined && {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
          photoUrl,
          galleryUrls: jsonUpdateValue(galleryJson),
        } as Prisma.ClubUpdateInput,
        include: { city: { include: { country: true } } },
      });

      await logClubPatchAudit(
        id,
        session,
        existing as unknown as Record<string, unknown>,
        {
          name: data.name,
          cityId: data.cityId,
          email: data.email,
          description: data.description,
          address: data.address,
          workingHours: data.workingHours,
          displayPhone: displayPhone !== undefined ? displayPhone : existing.displayPhone,
          tableCounts: tables.tableCounts,
          weeklyHours: weeklyHoursParsed,
          priceTiers: priceTiersParsed,
          galleryUrls: galleryList,
          ...(data.gamePrice !== undefined && { gamePrice: data.gamePrice }),
          ...(data.bookingEnabled !== undefined && { bookingEnabled: data.bookingEnabled }),
          ...(data.bookingSlotMinutes !== undefined && {
            bookingSlotMinutes: data.bookingSlotMinutes,
          }),
          ...(data.bookingAdvanceDays !== undefined && {
            bookingAdvanceDays: data.bookingAdvanceDays,
          }),
        },
        "club",
      );

      return NextResponse.json(club);
    }

    const body = await request.json();
    const parsedCounts = parseClubTableCounts(body.tableCounts);
    const tableCountsJson = tableCountsToJson(parsedCounts);
    const weeklyHoursParsed = parseWeeklyHours(body.weeklyHours);
    const priceTiersParsed = parsePriceTiers(body.priceTiers);
    const floorPlanParsed =
      body.floorPlan === null ? null : parseFloorPlan(body.floorPlan);
    const floorPlanJson =
      body.floorPlan === undefined
        ? undefined
        : body.floorPlan === null
          ? null
          : floorPlanToJson(floorPlanParsed);
    const data = clubUpdateSchema.parse(body);

    let displayPhone: string | null | undefined = undefined;
    if (data.displayPhone !== undefined) {
      if (!data.displayPhone) {
        displayPhone = null;
      } else {
        const phoneResult = await normalizePhoneForCity(
          data.displayPhone,
          data.cityId ?? existing.cityId,
        );
        if (phoneResult.error) {
          return NextResponse.json({ error: phoneResult.error }, { status: 400 });
        }
        displayPhone = phoneResult.e164;
      }
    }

    const coords = await clubCoordsIfAddressChanged(existing, {
      address: data.address,
      cityId: data.cityId,
    });

    const galleryOnly =
      body.galleryUrls !== undefined &&
      Object.keys(body).filter((k) => body[k] !== undefined).length === 1;

    const syncedFromBody =
      body.galleryUrls !== undefined
        ? syncClubPhotoFields(parseClubGalleryUrls(body.galleryUrls))
        : null;

    const localizedFields = await buildClubLocalizedUpdate({
      ...(data.description !== undefined && { description: data.description }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
      ...(data.gamePrice !== undefined && { gamePrice: data.gamePrice }),
      ...(body.priceTiers !== undefined && { priceTiers: priceTiersParsed }),
    });

    const updateData: Prisma.ClubUpdateInput = {
        ...(data.name !== undefined && {
          name: data.name,
          ...buildClubLatinFields(data.name),
        }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
        ...(body.tableCounts !== undefined && {
          tableCounts: jsonUpdateValue(tableCountsJson),
          tableCount: tableCountsJson ? clubTableCountsTotal(parsedCounts) : null,
        }),
        ...(body.weeklyHours !== undefined && {
          weeklyHours: jsonUpdateValue(weeklyHoursToJson(weeklyHoursParsed)),
        }),
        ...(body.priceTiers !== undefined && {
          priceTiers: jsonUpdateValue(priceTiersToJson(priceTiersParsed)),
        }),
        ...(floorPlanJson !== undefined && { floorPlan: jsonUpdateValue(floorPlanJson) }),
        ...(data.gamePrice !== undefined && { gamePrice: data.gamePrice }),
        ...clubLocalizedToPrisma(localizedFields),
        ...(displayPhone !== undefined && { displayPhone }),
        ...(coords !== undefined && {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
        ...(syncedFromBody && {
          galleryUrls: jsonUpdateValue(syncedFromBody.galleryUrls),
          photoUrl: syncedFromBody.photoUrl,
        }),
    };

    const club = await prisma.club.update({
      where: { id },
      data: updateData,
      include: { city: { include: { country: true } } },
    });

    const section = detectSectionFromBody(body, galleryOnly);
    await logClubPatchAudit(
      id,
      session,
      existing as unknown as Record<string, unknown>,
      {
        ...data,
        ...(body.tableCounts !== undefined && { tableCounts: parsedCounts }),
        ...(body.weeklyHours !== undefined && { weeklyHours: weeklyHoursParsed }),
        ...(body.priceTiers !== undefined && { priceTiers: priceTiersParsed }),
        ...(floorPlanJson !== undefined && { floorPlan: body.floorPlan }),
        ...(syncedFromBody && { galleryUrls: body.galleryUrls }),
      },
      section,
    );

    return NextResponse.json(club);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ImageProcessingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось обновить клуб" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    const club = await prisma.club.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { tournaments: true } },
      },
    });
    if (!club) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirmName?: unknown;
    };
    const confirmName =
      typeof body.confirmName === "string" ? body.confirmName.trim() : "";
    if (confirmName !== club.name) {
      return NextResponse.json(
        { error: "Введите точное название клуба для подтверждения" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.tournament.deleteMany({ where: { clubId: id } });
      await tx.club.delete({ where: { id } });
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "club.delete",
      entityType: "club",
      entityId: id,
      section: "admin_clubs",
      clubId: id,
      summary: `Удалён клуб «${club.name}»`,
      payload: {
        name: club.name,
        tournamentsDeleted: club._count.tournaments,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error("[clubs DELETE]", error);
    return NextResponse.json({ error: "Не удалось удалить клуб" }, { status: 500 });
  }
}
