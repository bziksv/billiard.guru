import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { clubUpdateSchema } from "@/lib/validators";

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
    const session = await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.club.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Клуб не найден" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let photoUrl = existing.photoUrl;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const raw = {
        name: String(formData.get("name") ?? existing.name),
        cityId: String(formData.get("cityId") ?? existing.cityId),
        email: String(formData.get("email") ?? existing.email ?? ""),
        description: String(formData.get("description") ?? ""),
        address: String(formData.get("address") ?? ""),
        workingHours: String(formData.get("workingHours") ?? ""),
        tableCount: formData.get("tableCount") ?? "",
        latitude: String(formData.get("latitude") ?? ""),
        longitude: String(formData.get("longitude") ?? ""),
      };

      const data = clubUpdateSchema.parse({
        name: raw.name,
        cityId: raw.cityId,
        email: raw.email || null,
        description: raw.description || null,
        address: raw.address || null,
        workingHours: raw.workingHours || null,
        tableCount: raw.tableCount === "" ? null : raw.tableCount,
        latitude: raw.latitude === "" ? null : raw.latitude,
        longitude: raw.longitude === "" ? null : raw.longitude,
      });

      const photo = formData.get("photo");
      if (photo instanceof File && photo.size > 0) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "clubs");
        await mkdir(uploadsDir, { recursive: true });
        const ext = path.extname(photo.name) || ".jpg";
        const filename = `${randomUUID()}${ext}`;
        const buffer = Buffer.from(await photo.arrayBuffer());
        await writeFile(path.join(uploadsDir, filename), buffer);
        photoUrl = `/uploads/clubs/${filename}`;
      }

      const club = await prisma.club.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.cityId !== undefined && { cityId: data.cityId }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
          ...(data.tableCount !== undefined && { tableCount: data.tableCount }),
          ...(data.latitude !== undefined && { latitude: data.latitude }),
          ...(data.longitude !== undefined && { longitude: data.longitude }),
          photoUrl,
        },
        include: { city: { include: { country: true } } },
      });

      await writeAuditLog({
        actorType: "admin",
        actorId: session.playerId,
        action: "club.update",
        entityType: "club",
        entityId: id,
      });

      return NextResponse.json(club);
    }

    const body = await request.json();
    const data = clubUpdateSchema.parse(body);

    const club = await prisma.club.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.workingHours !== undefined && { workingHours: data.workingHours }),
        ...(data.tableCount !== undefined && { tableCount: data.tableCount }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
      },
      include: { city: { include: { country: true } } },
    });

    await writeAuditLog({
      actorType: "admin",
      actorId: session.playerId,
      action: "club.update",
      entityType: "club",
      entityId: id,
    });

    return NextResponse.json(club);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ошибка валидации" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось обновить клуб" }, { status: 500 });
  }
}
