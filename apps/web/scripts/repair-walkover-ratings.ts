/**
 * Ремонт: техпоражения (WALKOVER) не должны менять рейтинг.
 *
 * 1) Находит RatingChange по матчам status=WALKOVER
 * 2) Откатывает цепочку с первого walkover (force) по затронутым матчам
 * 3) Заново начисляет рейтинг только по FINISHED матчам
 *
 *   cd apps/web && npx tsx scripts/repair-walkover-ratings.ts           # dry-run
 *   cd apps/web && npx tsx scripts/repair-walkover-ratings.ts --apply
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";
import {
  applyAutoRatingForMatch,
  forceReverseAutoRatingForMatch,
} from "../src/lib/rating-apply-match-server";
import { formatRating } from "../src/lib/rating";

const APPLY = process.argv.includes("--apply");

async function main() {
  const walkoverMatches = await prisma.tournamentMatch.findMany({
    where: { status: "WALKOVER" },
    select: {
      id: true,
      finishedAt: true,
      createdAt: true,
      tournament: { select: { name: true } },
    },
  });
  const walkoverIds = walkoverMatches.map((m) => m.id);
  if (walkoverIds.length === 0) {
    console.log("WALKOVER матчей нет.");
    return;
  }

  const walkoverChanges = await prisma.ratingChange.findMany({
    where: { matchId: { in: walkoverIds } },
    select: {
      id: true,
      playerId: true,
      matchId: true,
      oldRating: true,
      newRating: true,
      delta: true,
      createdAt: true,
      player: { select: { lastName: true, firstName: true, rating: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (walkoverChanges.length === 0) {
    console.log("Walkover RatingChange не найдены — нечего чинить.");
    return;
  }

  const woMeta = new Map(walkoverMatches.map((m) => [m.id, m]));

  console.log(
    `Найдено ${walkoverChanges.length} RatingChange по WALKOVER (игроков: ${new Set(walkoverChanges.map((c) => c.playerId)).size})`,
  );
  console.log(APPLY ? "РЕЖИМ: --apply (запись в БД)" : "РЕЖИМ: dry-run (без записи)");
  console.log("");

  const affectedPlayerIds = [...new Set(walkoverChanges.map((c) => c.playerId))];
  const walkoverIdSet = new Set(walkoverIds);

  type RebuildPlan = {
    playerId: string;
    name: string;
    ratingBefore: number;
    reverseMatchIds: string[];
    reapplyMatchIds: string[];
  };

  const plans: RebuildPlan[] = [];

  for (const playerId of affectedPlayerIds) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, lastName: true, firstName: true, rating: true },
    });
    if (!player) continue;

    const allChanges = await prisma.ratingChange.findMany({
      where: { playerId, matchId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { matchId: true, createdAt: true },
    });

    const firstWo = allChanges.find(
      (c) => c.matchId && walkoverIdSet.has(c.matchId),
    );
    if (!firstWo?.matchId) continue;

    const fromIdx = allChanges.findIndex((c) => c.matchId === firstWo.matchId);
    const suffixIds = [
      ...new Set(
        allChanges
          .slice(fromIdx)
          .map((c) => c.matchId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const matchMeta = await prisma.tournamentMatch.findMany({
      where: { id: { in: suffixIds } },
      select: {
        id: true,
        status: true,
        finishedAt: true,
        createdAt: true,
      },
    });
    const metaById = new Map(matchMeta.map((m) => [m.id, m]));
    const sortKey = (id: string) => {
      const m = metaById.get(id);
      return (m?.finishedAt ?? m?.createdAt ?? new Date(0)).getTime();
    };

    const reverseMatchIds = [...suffixIds].sort((a, b) => sortKey(b) - sortKey(a));
    const reapplyMatchIds = reverseMatchIds
      .filter((id) => metaById.get(id)?.status === "FINISHED")
      .sort((a, b) => sortKey(a) - sortKey(b));

    plans.push({
      playerId,
      name: `${player.lastName} ${player.firstName}`,
      ratingBefore: player.rating,
      reverseMatchIds,
      reapplyMatchIds,
    });

    const sample = walkoverChanges.filter((c) => c.playerId === playerId);
    for (const c of sample) {
      const m = c.matchId ? woMeta.get(c.matchId) : null;
      console.log(
        `  walkover ${c.matchId?.slice(0, 10)}… ${m?.tournament.name ?? "?"} ${formatRating(c.oldRating)}→${formatRating(c.newRating)} (${c.player.lastName})`,
      );
    }
  }

  const allReverse = [...new Set(plans.flatMap((p) => p.reverseMatchIds))];
  const matchTimes = await prisma.tournamentMatch.findMany({
    where: { id: { in: allReverse } },
    select: { id: true, finishedAt: true, createdAt: true, status: true },
  });
  const timeById = new Map(
    matchTimes.map((m) => [m.id, (m.finishedAt ?? m.createdAt).getTime()]),
  );
  const statusById = new Map(matchTimes.map((m) => [m.id, m.status]));

  const reverseOrder = [...allReverse].sort(
    (a, b) => (timeById.get(b) ?? 0) - (timeById.get(a) ?? 0),
  );
  const reapplyOrder = reverseOrder
    .filter((id) => statusById.get(id) === "FINISHED")
    .reverse();

  console.log("");
  for (const p of plans) {
    console.log(
      `• ${p.name}: сейчас ${formatRating(p.ratingBefore)}; reverse ${p.reverseMatchIds.length}, reapply ${p.reapplyMatchIds.length}`,
    );
  }
  console.log(
    `\nУникальных матчей: reverse ${reverseOrder.length}, reapply ${reapplyOrder.length}`,
  );

  if (!APPLY) {
    console.log(
      "\nDry-run. Для записи: npx tsx scripts/repair-walkover-ratings.ts --apply",
    );
    return;
  }

  console.log("\n→ Force reverse…");
  for (const matchId of reverseOrder) {
    const n = await forceReverseAutoRatingForMatch(matchId);
    console.log(
      `  ${matchId.slice(0, 12)}… ${statusById.get(matchId)} reversed=${n}`,
    );
  }

  console.log("\n→ Re-apply FINISHED…");
  for (const matchId of reapplyOrder) {
    const rows = await applyAutoRatingForMatch(matchId);
    console.log(
      `  ${matchId.slice(0, 12)}… applied=${rows ? rows.length : 0}`,
    );
  }

  console.log("\n→ Итог:");
  for (const p of plans) {
    const after = await prisma.player.findUnique({
      where: { id: p.playerId },
      select: { rating: true },
    });
    const playerWoMatchIds = (
      await prisma.ratingChange.findMany({
        where: { playerId: p.playerId, matchId: { not: null } },
        select: { matchId: true },
      })
    )
      .map((c) => c.matchId!)
      .filter((id) => walkoverIdSet.has(id));
    console.log(
      `  ${p.name}: ${formatRating(p.ratingBefore)} → ${formatRating(after?.rating ?? NaN)} (walkover RC left: ${playerWoMatchIds.length})`,
    );
  }

  const leftChanges = await prisma.ratingChange.findMany({
    where: { matchId: { in: walkoverIds } },
    select: { id: true },
  });
  console.log(`\nWalkover RatingChange осталось: ${leftChanges.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
