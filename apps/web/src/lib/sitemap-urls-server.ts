import { prisma } from "@/lib/prisma";
import { PUBLIC_TOURNAMENT_STATUSES } from "@/lib/public-display";

export type SitemapDynamicUrl = {
  path: string;
  lastModified: Date;
};

export async function getSitemapDynamicUrls(): Promise<SitemapDynamicUrl[]> {
  const [tournaments, clubs, players, coaches] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: [...PUBLIC_TOURNAMENT_STATUSES] } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.club.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.player.findMany({
      where: { isVerified: true, isCoach: false },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.player.findMany({
      where: { isVerified: true, isCoach: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    }),
  ]);

  const urls: SitemapDynamicUrl[] = [];

  for (const t of tournaments) {
    urls.push({ path: `/tournaments/${t.id}`, lastModified: t.updatedAt });
  }
  for (const c of clubs) {
    urls.push({ path: `/clubs/${c.id}`, lastModified: c.updatedAt });
  }
  for (const p of players) {
    urls.push({ path: `/players/${p.id}`, lastModified: p.updatedAt });
  }
  for (const c of coaches) {
    urls.push({ path: `/coaches/${c.id}`, lastModified: c.updatedAt });
  }

  return urls;
}
