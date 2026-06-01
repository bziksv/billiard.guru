import { prisma } from "@/lib/prisma";

export async function refreshCoachReviewStats(coachId: string) {
  const agg = await prisma.coachRating.aggregate({
    where: { coachId },
    _avg: { score: true },
    _count: { score: true },
  });

  await prisma.player.update({
    where: { id: coachId },
    data: {
      coachReviewAvg: agg._count.score > 0 ? agg._avg.score : null,
      coachReviewCount: agg._count.score,
    },
  });

  return {
    avg: agg._avg.score,
    count: agg._count.score,
  };
}

export async function getCoachForReview(coachId: string) {
  return prisma.player.findFirst({
    where: { id: coachId, isCoach: true, isVerified: true },
    select: { id: true, firstName: true, lastName: true },
  });
}
