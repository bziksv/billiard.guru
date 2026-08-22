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
            isVerified: true,
            telegramUsername: true,
            telegramId: true,
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
        adminReply: idea.adminReply,
        repliedAt: idea.repliedAt?.toISOString() ?? null,
        createdAt: idea.createdAt.toISOString(),
        moderatedAt: idea.moderatedAt?.toISOString() ?? null,
        author: {
          id: idea.author.id,
          firstName: idea.author.firstName,
          lastName: idea.author.lastName,
          isVerified: idea.author.isVerified,
          telegramUsername: idea.author.telegramUsername,
          hasTelegram: Boolean(idea.author.telegramId),
          city: idea.author.city,
        },
      })),
    );
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить идеи" }, { status: 500 });
  }
}
