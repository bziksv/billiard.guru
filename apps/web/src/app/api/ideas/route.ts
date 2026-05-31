import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { createIdea } from "@/lib/idea-moderation";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ideaCreateSchema } from "@/lib/validators";

function serializeIdea(
  idea: {
    id: string;
    title: string;
    body: string;
    status: string;
    likesCount: number;
    dislikesCount: number;
    rejectReason: string | null;
    createdAt: Date;
    moderatedAt: Date | null;
    author: { id: string; firstName: string; lastName: string };
  },
  myVote?: "LIKE" | "DISLIKE" | null,
) {
  return {
    id: idea.id,
    title: idea.title,
    body: idea.body,
    status: idea.status,
    likesCount: idea.likesCount,
    dislikesCount: idea.dislikesCount,
    rejectReason: idea.rejectReason,
    createdAt: idea.createdAt.toISOString(),
    moderatedAt: idea.moderatedAt?.toISOString() ?? null,
    author: {
      id: idea.author.id,
      firstName: idea.author.firstName,
      lastName: idea.author.lastName,
    },
    myVote: myVote ?? null,
  };
}

export async function GET() {
  try {
    const player = await getCurrentPlayer();

    const approved = await prisma.idea.findMany({
      where: { status: "APPROVED" },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
    });

    let votes: Record<string, "LIKE" | "DISLIKE"> = {};
    if (player) {
      const myVotes = await prisma.ideaVote.findMany({
        where: {
          playerId: player.id,
          ideaId: { in: approved.map((i) => i.id) },
        },
      });
      votes = Object.fromEntries(myVotes.map((v) => [v.ideaId, v.value]));
    }

    const mine = player
      ? await prisma.idea.findMany({
          where: { authorId: player.id },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return NextResponse.json({
      approved: approved.map((idea) => serializeIdea(idea, votes[idea.id] ?? null)),
      mine: mine.map((idea) => serializeIdea(idea)),
    });
  } catch (error) {
    logger.error({ error }, "Failed to load ideas");
    return NextResponse.json({ error: "Не удалось загрузить идеи" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    if (!player.isVerified) {
      return NextResponse.json(
        { error: "Подтвердите регистрацию в Telegram" },
        { status: 403 },
      );
    }

    const data = ideaCreateSchema.parse(await request.json());
    const idea = await createIdea(player.id, data.title, data.body);

    return NextResponse.json(serializeIdea(idea), { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("подтверждённые")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error({ error }, "Failed to create idea");
    return NextResponse.json({ error: "Не удалось отправить идею" }, { status: 500 });
  }
}
