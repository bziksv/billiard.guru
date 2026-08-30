/**
 * Полный аудит рейтингов по всем игрокам.
 *   cd apps/web && npx tsx scripts/audit-all-player-ratings.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  const report: string[] = [];
  const log = (s = "") => {
    report.push(s);
    console.log(s);
  };

  log("=== АУДИТ РЕЙТИНГОВ: ВСЕ ИГРОКИ ===");
  log(`Дата: ${new Date().toISOString()}`);

  const reasons = await prisma.ratingChange.groupBy({
    by: ["reason"],
    _count: true,
    orderBy: { _count: { reason: "desc" } },
  });
  log("\n## 1. Типы RatingChange (все время)");
  for (const r of reasons) log(`  ${r.reason}: ${r._count}`);

  const noMatch = await prisma.ratingChange.findMany({
    where: { matchId: null },
    select: {
      oldRating: true,
      newRating: true,
      delta: true,
      reason: true,
      createdAt: true,
      player: { select: { id: true, lastName: true, firstName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  log(`\n## 2. RatingChange без matchId: ${noMatch.length}`);
  for (const c of noMatch) {
    log(
      `  ${c.createdAt.toISOString()} | ${c.player.lastName} ${c.player.firstName} (${c.player.role}) | ${c.oldRating}→${c.newRating} (Δ${c.delta}) | reason=${c.reason}`,
    );
  }

  const weird = await prisma.ratingChange.findMany({
    where: { reason: { notIn: ["match_win", "match_loss"] } },
    select: {
      oldRating: true,
      newRating: true,
      delta: true,
      reason: true,
      matchId: true,
      createdAt: true,
      player: { select: { lastName: true, firstName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  log(`\n## 3. RatingChange с reason ≠ match_win/match_loss: ${weird.length}`);
  for (const c of weird) {
    log(
      `  ${c.createdAt.toISOString()} | ${c.player.lastName} ${c.player.firstName} | ${c.oldRating}→${c.newRating} | ${c.reason} | match=${c.matchId ?? "null"}`,
    );
  }

  const ratingAudits = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: { contains: "rating" } },
        { action: { contains: "Rating" } },
        { summary: { contains: "рейтинг" } },
        { summary: { contains: "Рейтинг" } },
      ],
    },
    select: {
      action: true,
      summary: true,
      entityId: true,
      actorId: true,
      createdAt: true,
      payload: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const byAction = new Map<string, number>();
  for (const a of ratingAudits) byAction.set(a.action, (byAction.get(a.action) ?? 0) + 1);
  log("\n## 4. AuditLog по рейтингу — сводка");
  for (const [k, v] of [...byAction.entries()].sort((a, b) => b[1] - a[1])) {
    log(`  ${k}: ${v}`);
  }

  const manualish = ratingAudits.filter((a) =>
    /manual|base_fix|pair\.rating|override|player\.update/i.test(a.action),
  );
  log(`\n## 4b. Ручные/подозрительные audit (${manualish.length})`);
  for (const a of manualish) {
    let who = "";
    if (a.entityId) {
      const p = await prisma.player.findUnique({
        where: { id: a.entityId },
        select: { lastName: true, firstName: true },
      });
      if (p) who = `${p.lastName} ${p.firstName}`;
    }
    log(
      `  ${a.createdAt.toISOString()} | ${a.action} | ${a.summary ?? ""} | entity=${who || a.entityId || "-"} | actor=${a.actorId ?? "system"} | payload=${JSON.stringify(a.payload)}`,
    );
  }

  const overrides = await prisma.tournamentTeam.findMany({
    where: { ratingOverride: { not: null } },
    select: {
      ratingOverride: true,
      tournament: { select: { name: true, status: true } },
      player1: { select: { lastName: true, firstName: true, rating: true } },
      player2: { select: { lastName: true, firstName: true, rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  log(`\n## 5. Активные ratingOverride у команд СЕЙЧАС: ${overrides.length}`);
  for (const o of overrides) {
    const pair = o.player2
      ? `${o.player1.lastName}/${o.player2.lastName}`
      : `${o.player1.lastName} ${o.player1.firstName}`;
    log(
      `  override=${o.ratingOverride} | ${pair} (p1=${o.player1.rating}) | ${o.tournament.name} [${o.tournament.status}]`,
    );
  }

  const roles = await prisma.player.groupBy({ by: ["role"], _count: true });
  log("\n## 6. Игроки по ролям");
  for (const r of roles) log(`  ${r.role}: ${r._count}`);

  const special = await prisma.player.findMany({
    where: { role: { not: "PLAYER" } },
    select: { lastName: true, firstName: true, role: true, rating: true, id: true },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
  });
  log(`\n## 6b. Не-PLAYER (${special.length})`);
  for (const p of special) {
    log(`  ${p.role} | ${p.lastName} ${p.firstName} | rating=${p.rating}`);
  }

  const t = await prisma.tournament.findFirst({
    where: { name: { contains: "московская пирамида" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  if (t) {
    log(`\n## 7. Турнир «${t.name}» — все участники`);
    const teams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: t.id },
      select: {
        ratingOverride: true,
        status: true,
        player1: {
          select: { id: true, lastName: true, firstName: true, rating: true, role: true },
        },
        player2: {
          select: { id: true, lastName: true, firstName: true, rating: true, role: true },
        },
      },
    });
    const regs = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: t.id },
      select: {
        player: {
          select: { id: true, lastName: true, firstName: true, rating: true, role: true },
        },
      },
    });

    const playerMap = new Map<
      string,
      { lastName: string; firstName: string; rating: number; role: string }
    >();
    for (const r of regs) playerMap.set(r.player.id, r.player);
    for (const tm of teams) {
      playerMap.set(tm.player1.id, tm.player1);
      if (tm.player2) playerMap.set(tm.player2.id, tm.player2);
    }

    const matchIds = (
      await prisma.tournamentMatch.findMany({
        where: { tournamentId: t.id },
        select: { id: true },
      })
    ).map((m) => m.id);

    log(`  Участников: ${playerMap.size}`);
    log(
      `  ratingOverride сейчас: ${teams.filter((x) => x.ratingOverride != null).length}`,
    );
    log("  name | role | now | changes_in_t | nonstandard_ever | reasons_in_t");

    const withManual: string[] = [];
    const rows = [];
    for (const [pid, p] of playerMap) {
      const inT = await prisma.ratingChange.findMany({
        where: { playerId: pid, matchId: { in: matchIds } },
        select: { reason: true },
      });
      const nonstandard = await prisma.ratingChange.count({
        where: {
          playerId: pid,
          OR: [{ matchId: null }, { reason: { notIn: ["match_win", "match_loss"] } }],
        },
      });
      const reasonSet = [...new Set(inT.map((c) => c.reason))].join(",") || "-";
      rows.push({
        name: `${p.lastName} ${p.firstName}`,
        role: p.role,
        rating: p.rating,
        inTournamentChanges: inT.length,
        nonstandard,
        reasons: reasonSet,
      });
      if (nonstandard > 0) withManual.push(`${p.lastName} ${p.firstName}: ${nonstandard}`);
    }
    rows.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    for (const r of rows) {
      log(
        `  ${r.name} | ${r.role} | ${r.rating} | ${r.inTournamentChanges} | ${r.nonstandard} | ${r.reasons}`,
      );
    }
    log(
      `\n  Участники с нестандартными RatingChange за всё время: ${withManual.length}`,
    );
    for (const line of withManual) log(`    !! ${line}`);
  }

  log("\n## 8. Player.rating ≠ последний RatingChange.newRating");
  const allPlayers = await prisma.player.findMany({
    select: { id: true, lastName: true, firstName: true, rating: true, role: true },
  });
  const mismatchRows: string[] = [];
  for (const p of allPlayers) {
    const last = await prisma.ratingChange.findFirst({
      where: { playerId: p.id },
      orderBy: { createdAt: "desc" },
      select: { newRating: true, reason: true, createdAt: true, matchId: true },
    });
    if (!last) continue;
    if (Math.abs(last.newRating - p.rating) > 0.001) {
      mismatchRows.push(
        `  ${p.lastName} ${p.firstName} (${p.role}): player=${p.rating} lastChange=${last.newRating} (${last.reason}, ${last.createdAt.toISOString()}, match=${last.matchId ?? "null"})`,
      );
    }
  }
  log(`  Расхождений: ${mismatchRows.length}`);
  for (const line of mismatchRows) log(line);

  // 9) ALL players who ever had nonstandard change
  log("\n## 9. ВСЕ игроки с нестандартными RatingChange (за всё время)");
  const nonstdPlayers = await prisma.ratingChange.findMany({
    where: {
      OR: [{ matchId: null }, { reason: { notIn: ["match_win", "match_loss"] } }],
    },
    distinct: ["playerId"],
    select: {
      playerId: true,
      player: { select: { lastName: true, firstName: true, role: true, rating: true } },
    },
  });
  log(`  Игроков: ${nonstdPlayers.length}`);
  for (const row of nonstdPlayers) {
    const hist = await prisma.ratingChange.findMany({
      where: {
        playerId: row.playerId,
        OR: [{ matchId: null }, { reason: { notIn: ["match_win", "match_loss"] } }],
      },
      select: { reason: true, oldRating: true, newRating: true, createdAt: true, matchId: true },
      orderBy: { createdAt: "desc" },
    });
    log(
      `  ${row.player.lastName} ${row.player.firstName} (${row.player.role}, now=${row.player.rating}) — ${hist.length} записей`,
    );
    for (const h of hist) {
      log(
        `    ${h.createdAt.toISOString()} ${h.oldRating}→${h.newRating} ${h.reason} match=${h.matchId ?? "null"}`,
      );
    }
  }

  const out = resolve(__dirname, "output-rating-audit.txt");
  writeFileSync(out, report.join("\n"), "utf8");
  log(`\nОтчёт: ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
