import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();

    const rows = await prisma.clubNews.findMany({
      include: {
        club: {
          select: {
            id: true,
            name: true,
            city: { select: { nameRu: true } },
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        status: row.status,
        rejectReason: row.rejectReason,
        createdAt: row.createdAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        moderatedAt: row.moderatedAt?.toISOString() ?? null,
        club: row.club,
        author: row.author,
      })),
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить новости" }, { status: 500 });
  }
}
