/**
 * Аудит рейтингов по всем турнирам.
 *   cd apps/web && npx tsx scripts/audit-all-tournaments-ratings.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/prisma";

async function main() {
  const lines: string[] = [];
  const log = (s = "") => {
    lines.push(s);
    console.log(s);
  };

  log("=== АУДИТ РЕЙТИНГОВ ПО ВСЕМ ТУРНИРАМ ===");
  log(`Дата: ${new Date().toISOString()}`);

  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      format: true,
      ratingSource: true,
      createdAt: true,
      startsAt: true,
      club: { select: { name: true } },
      _count: { select: { matches: true, teams: true, registrations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  log(`\nТурниров всего: ${tournaments.length}`);

  const allMatchIdsByTournament = new Map<string, string[]>();
  const allMatches = await prisma.tournamentMatch.findMany({
    select: { id: true, tournamentId: true },
  });
  for (const m of allMatches) {
    const list = allMatchIdsByTournament.get(m.tournamentId) ?? [];
    list.push(m.id);
    allMatchIdsByTournament.set(m.tournamentId, list);
  }

  const allChanges = await prisma.ratingChange.findMany({
    select: {
      matchId: true,
      reason: true,
      playerId: true,
      oldRating: true,
      newRating: true,
      delta: true,
      createdAt: true,
    },
  });
  const changesByMatch = new Map<string, typeof allChanges>();
  for (const c of allChanges) {
    if (!c.matchId) continue;
    const list = changesByMatch.get(c.matchId) ?? [];
    list.push(c);
    changesByMatch.set(c.matchId, list);
  }

  const teams = await prisma.tournamentTeam.findMany({
    select: {
      id: true,
      tournamentId: true,
      ratingOverride: true,
      player1: { select: { id: true, lastName: true, firstName: true, rating: true } },
      player2: { select: { id: true, lastName: true, firstName: true, rating: true } },
    },
  });
  const teamsByTournament = new Map<string, typeof teams>();
  for (const t of teams) {
    const list = teamsByTournament.get(t.tournamentId) ?? [];
    list.push(t);
    teamsByTournament.set(t.tournamentId, list);
  }

  const pairAudits = await prisma.auditLog.findMany({
    where: { action: "tournament.pair.rating" },
    select: {
      entityId: true,
      actorId: true,
      createdAt: true,
      payload: true,
      summary: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const teamIdToTournament = new Map(
    teams.map((t) => [t.id, t.tournamentId] as const),
  );
  const teamIdToLabel = new Map(
    teams.map((t) => {
      const label = t.player2
        ? `${t.player1.lastName}/${t.player2.lastName}`
        : `${t.player1.lastName} ${t.player1.firstName}`;
      return [t.id, label] as const;
    }),
  );

  const actors = await prisma.player.findMany({
    where: {
      id: {
        in: [
          ...new Set(
            pairAudits.map((a) => a.actorId).filter((x): x is string => !!x),
          ),
        ],
      },
    },
    select: { id: true, lastName: true, firstName: true },
  });
  const actorName = new Map(
    actors.map((a) => [a.id, `${a.lastName} ${a.firstName}`] as const),
  );

  // Global reason stats
  const reasonCount = new Map<string, number>();
  for (const c of allChanges) {
    reasonCount.set(c.reason, (reasonCount.get(c.reason) ?? 0) + 1);
  }
  log("\n## Глобально: RatingChange по reason");
  for (const [r, n] of [...reasonCount.entries()].sort((a, b) => b[1] - a[1])) {
    log(`  ${r}: ${n}`);
  }
  const noMatch = allChanges.filter((c) => !c.matchId).length;
  log(`  без matchId: ${noMatch}`);

  log("\n## По каждому турниру");
  log(
    "name | status | source | teams | matches | ratingChanges | overrides_now | pair_override_edits | nonstandard_reasons",
  );

  type TourRow = {
    id: string;
    name: string;
    status: string;
    source: string;
    teams: number;
    matches: number;
    changes: number;
    overridesNow: number;
    overrideEdits: number;
    nonstandard: number;
    overrideDetails: string[];
    editDetails: string[];
  };

  const rows: TourRow[] = [];

  for (const t of tournaments) {
    const matchIds = allMatchIdsByTournament.get(t.id) ?? [];
    let changeCount = 0;
    let nonstandard = 0;
    for (const mid of matchIds) {
      const ch = changesByMatch.get(mid) ?? [];
      changeCount += ch.length;
      for (const c of ch) {
        if (c.reason !== "match_win" && c.reason !== "match_loss") nonstandard++;
      }
    }

    const tTeams = teamsByTournament.get(t.id) ?? [];
    const overridesNow = tTeams.filter((x) => x.ratingOverride != null);
    const overrideDetails = overridesNow.map((o) => {
      const label = o.player2
        ? `${o.player1.lastName}/${o.player2.lastName}`
        : `${o.player1.lastName} ${o.player1.firstName}`;
      return `${label}=${o.ratingOverride} (sys p1=${o.player1.rating})`;
    });

    const edits = pairAudits.filter(
      (a) => a.entityId && teamIdToTournament.get(a.entityId) === t.id,
    );
    const editDetails = edits.map((a) => {
      const payload = a.payload as { ratingOverride?: number | null } | null;
      const who = a.actorId ? actorName.get(a.actorId) ?? a.actorId : "system";
      const team = a.entityId ? teamIdToLabel.get(a.entityId) ?? a.entityId : "?";
      return `${a.createdAt.toISOString().slice(0, 16)} ${team} → ${payload?.ratingOverride ?? "null"} (by ${who})`;
    });

    rows.push({
      id: t.id,
      name: t.name,
      status: t.status,
      source: t.ratingSource ?? "SYSTEM",
      teams: t._count.teams,
      matches: t._count.matches,
      changes: changeCount,
      overridesNow: overridesNow.length,
      overrideEdits: edits.length,
      nonstandard,
      overrideDetails,
      editDetails,
    });

    log(
      `${t.name.replace(/\s+/g, " ").slice(0, 70)} | ${t.status} | ${t.ratingSource ?? "SYSTEM"} | teams=${t._count.teams} | matches=${t._count.matches} | RC=${changeCount} | ovNow=${overridesNow.length} | ovEdits=${edits.length} | weird=${nonstandard}`,
    );
  }

  const withOverrides = rows.filter((r) => r.overridesNow > 0 || r.overrideEdits > 0);
  log(`\n## Турниры с override (сейчас или в истории аудита): ${withOverrides.length}`);
  for (const r of withOverrides) {
    log(`\n### ${r.name} [${r.status}] source=${r.source}`);
    log(`  overrides сейчас (${r.overridesNow}):`);
    if (r.overrideDetails.length === 0) log("    —");
    for (const d of r.overrideDetails) log(`    ${d}`);
    log(`  правки в аудите (${r.overrideEdits}):`);
    if (r.editDetails.length === 0) log("    —");
    for (const d of r.editDetails) log(`    ${d}`);
  }

  const weirdTours = rows.filter((r) => r.nonstandard > 0);
  log(`\n## Турниры с нестандартными RatingChange: ${weirdTours.length}`);
  for (const r of weirdTours) log(`  ${r.name}: weird=${r.nonstandard}`);

  const manual = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "rating.manual_base_fix",
          "club.player_rating.set",
          "club.player_rating.update",
          "club.player_rating.remove",
          "rating.bulk_recalc",
          "rating.snapshot_restore",
          "tournament.rating_source_fix",
        ],
      },
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

  log(`\n## Глобальные ручные/служебные операции с рейтингом: ${manual.length}`);
  const byAct = new Map<string, number>();
  for (const a of manual) byAct.set(a.action, (byAct.get(a.action) ?? 0) + 1);
  for (const [k, v] of byAct) log(`  ${k}: ${v}`);

  log("\n### rating.manual_base_fix (все)");
  for (const a of manual.filter((x) => x.action === "rating.manual_base_fix")) {
    log(
      `  ${a.createdAt.toISOString()} | ${a.summary} | payload=${JSON.stringify(a.payload)}`,
    );
  }

  log("\n### club.player_rating.set/update (сводка по игрокам)");
  const clubActs = manual.filter((x) =>
    x.action.startsWith("club.player_rating"),
  );
  const clubPlayerIds = [
    ...new Set(clubActs.map((a) => a.entityId).filter((x): x is string => !!x)),
  ];
  const clubPlayers = await prisma.player.findMany({
    where: { id: { in: clubPlayerIds } },
    select: { id: true, lastName: true, firstName: true, rating: true },
  });
  const clubPlayerName = new Map(
    clubPlayers.map((p) => [p.id, `${p.lastName} ${p.firstName}`] as const),
  );
  for (const a of clubActs) {
    const name = a.entityId ? clubPlayerName.get(a.entityId) ?? a.entityId : "?";
    log(
      `  ${a.createdAt.toISOString().slice(0, 16)} | ${a.action} | ${name} | ${a.summary ?? ""} | ${JSON.stringify(a.payload)}`,
    );
  }

  // Clean summary table
  log("\n## ИТОГ (коротко)");
  log(`  Турниров: ${rows.length}`);
  log(`  С ratingOverride сейчас: ${rows.filter((r) => r.overridesNow > 0).length}`);
  log(`  Где когда-либо правили pair override: ${rows.filter((r) => r.overrideEdits > 0).length}`);
  log(`  С нестандартными RatingChange: ${weirdTours.length}`);
  log(`  Ручных правок базы игрока: ${manual.filter((x) => x.action === "rating.manual_base_fix").length}`);
  log(
    `  Турниры БЕЗ любых override/ручных следов: ${rows.filter((r) => r.overridesNow === 0 && r.overrideEdits === 0 && r.nonstandard === 0).length}`,
  );

  const out = resolve(__dirname, "output-tournaments-rating-audit.txt");
  writeFileSync(out, lines.join("\n"), "utf8");
  log(`\nОтчёт: ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
