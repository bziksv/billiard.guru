import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSuperAdmin();

    const ideas = await prisma.idea.findMany({
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: { select: { nameRu: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        body: idea.body,
        status: idea.status,
        likesCount: idea.likesCount,
        dislikesCount: idea.dislikesCount,
        rejectReason: idea.rejectReason,
        createdAt: idea.createdAt.toISOString(),
        moderatedAt: idea.moderatedAt?.toISOString() ?? null,
        author: idea.author,
      })),
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить идеи" }, { status: 500 });
  }
}
