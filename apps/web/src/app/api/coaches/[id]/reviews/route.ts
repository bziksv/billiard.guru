import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { refreshCoachReviewStats, getCoachForReview } from "@/lib/coach-reviews-server";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import { coachReviewSchema } from "@/lib/validators";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const { id: coachId } = await ctx.params;
    const coach = await getCoachForReview(coachId);
    if (!coach) {
      return NextResponse.json({ error: "Тренер не найден" }, { status: 404 });
    }

    const viewer = await getCurrentPlayer();

    const [reviews, myReview] = await Promise.all([
      prisma.coachRating.findMany({
        where: { coachId },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          rater: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      viewer
        ? prisma.coachRating.findUnique({
            where: { coachId_raterId: { coachId, raterId: viewer.id } },
            select: { score: true, comment: true, updatedAt: true },
          })
        : Promise.resolve(null),
    ]);

    const player = await prisma.player.findUnique({
      where: { id: coachId },
      select: { coachReviewAvg: true, coachReviewCount: true },
    });

    return NextResponse.json({
      summary: {
        avg: player?.coachReviewAvg ?? null,
        count: player?.coachReviewCount ?? 0,
      },
      myReview,
      reviews: reviews.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        rater: {
          id: r.rater.id,
          name: `${r.rater.lastName} ${r.rater.firstName[0]}.`,
        },
      })),
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить оценки" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const viewer = await getCurrentPlayer();
    if (!viewer) {
      return NextResponse.json({ error: "Войдите, чтобы оценить тренера" }, { status: 401 });
    }

    const { id: coachId } = await ctx.params;
    const coach = await getCoachForReview(coachId);
    if (!coach) {
      return NextResponse.json({ error: "Тренер не найден" }, { status: 404 });
    }

    if (viewer.id === coachId) {
      return NextResponse.json({ error: "Нельзя оценить себя" }, { status: 400 });
    }

    const body = await request.json();
    const data = coachReviewSchema.parse(body);
    const comment = data.comment?.trim() ? data.comment.trim() : null;

    await prisma.coachRating.upsert({
      where: { coachId_raterId: { coachId, raterId: viewer.id } },
      create: {
        coachId,
        raterId: viewer.id,
        score: data.score,
        comment,
      },
      update: {
        score: data.score,
        comment,
      },
    });

    const summary = await refreshCoachReviewStats(coachId);

    return NextResponse.json({
      ok: true,
      summary: {
        avg: summary.avg,
        count: summary.count,
      },
      myReview: { score: data.score, comment },
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Некорректная оценка (от 1 до 5)" }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось сохранить оценку" }, { status: 500 });
  }
}
