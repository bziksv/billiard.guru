/**
 * Сформировать сетку и прогнать все доступные встречи (team1 побеждает).
 * Проверка: все auto-advance links после каждого тура.
 *
 * npx tsx scripts/simulate-fixed-swiss-tournament.ts [tournamentId] [--regenerate] [--verbose]
 */
import { prisma } from "../src/lib/prisma";
import {
  advanceWinner,
  generateTournamentPairing,
  processByes,
  regenerateBracket,
} from "../src/lib/bracket-service";
import {
  fixedSwissMatchNo,
  getFixedSwissLinksForMatchCount,
} from "../src/lib/fixed-swiss-grid";
import { shouldAutoAdvanceFixedSwissLink } from "../src/lib/fixed-swiss-layout";

const args = process.argv.slice(2);
const regenerate = args.includes("--regenerate");
const verbose = args.includes("--verbose");
const tournamentId =
  args.find((a) => !a.startsWith("--")) ?? "cmqf3zlvf00003i3kcusdpfnz";

type SlotRow = {
  id: string;
  round: number;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerTeamId: string | null;
  status: string;
};

function buildByeCache(
  rows: SlotRow[],
  tournamentId: string,
  format: string,
) {
  const slotMap = new Map(rows.map((m) => [`${m.round}:${m.slot}`, m]));
  const byId = new Map(rows.map((m) => [m.id, m]));
  return {
    tournamentId,
    format,
    matchCount: rows.length,
    maxRound: Math.max(0, ...rows.map((m) => m.round)),
    slotMap,
    byId,
  };
}

function isReady(m: SlotRow): boolean {
  if (m.winnerTeamId || m.status === "FINISHED" || m.status === "WALKOVER") {
    return false;
  }
  if (m.team1Id && m.team2Id) return true;
  if (m.round === 1 && (m.team1Id || m.team2Id)) return true;
  return false;
}

function pickWinner(m: SlotRow): string {
  if (m.team1Id && m.team2Id) return m.team1Id;
  return (m.team1Id ?? m.team2Id)!;
}

async function auditAdvances(
  all: SlotRow[],
  matchCount: number,
  maxRound: number,
): Promise<string[]> {
  const links = getFixedSwissLinksForMatchCount(matchCount, maxRound);
  const byKey = (r: number, s: number) =>
    all.find((m) => m.round === r && m.slot === s);
  const broken: string[] = [];

  for (const l of links) {
    if (!shouldAutoAdvanceFixedSwissLink(l, matchCount, maxRound)) continue;
    const src = byKey(l.fromRound, l.fromSlot);
    if (!src?.winnerTeamId) continue;
    const teamId =
      l.kind === "win"
        ? src.winnerTeamId
        : src.team1Id === src.winnerTeamId
          ? src.team2Id
          : src.team1Id;
    if (!teamId) continue;
    const dest = byKey(l.toRound, l.toSlot);
    if (!dest) continue;
    const field = l.toTeam === 1 ? dest.team1Id : dest.team2Id;
    if (field !== teamId) {
      const fromNo = fixedSwissMatchNo(l.fromRound, l.fromSlot, matchCount, maxRound);
      const toNo = fixedSwissMatchNo(l.toRound, l.toSlot, matchCount, maxRound);
      broken.push(
        `#${fromNo} ${l.kind} → #${toNo} t${l.toTeam} (expected team ${teamId.slice(0, 8)}, got ${field?.slice(0, 8) ?? "empty"})`,
      );
    }
  }
  return broken;
}

async function loadMatches(): Promise<SlotRow[]> {
  return prisma.tournamentMatch.findMany({
    where: { tournamentId },
    select: {
      id: true,
      round: true,
      slot: true,
      team1Id: true,
      team2Id: true,
      winnerTeamId: true,
      status: true,
    },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });
}

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      name: true,
      format: true,
      _count: {
        select: {
          teams: { where: { status: "CONFIRMED" } },
          registrations: { where: { status: "CONFIRMED" } },
        },
      },
    },
  });
  if (!tournament) throw new Error("Tournament not found");

  const participants =
    tournament._count.teams || tournament._count.registrations;
  console.log(
    `Tournament: ${tournament.name} (${tournament.format}), participants: ${participants}`,
  );

  const existing = await prisma.tournamentMatch.count({
    where: { tournamentId },
  });
  if (regenerate && existing > 0) {
    console.log("Regenerating bracket…");
    await regenerateBracket(prisma, tournamentId);
  } else if (existing === 0) {
    console.log("Generating bracket…");
    await generateTournamentPairing(prisma, tournamentId);
  } else {
    console.log(`Bracket exists (${existing} matches), simulating…`);
  }

  const matchCount = await prisma.tournamentMatch.count({
    where: { tournamentId },
  });
  const maxRound = Math.max(
    ...(await loadMatches()).map((m) => m.round),
    0,
  );
  console.log(`Matches: ${matchCount}, maxRound: ${maxRound}`);

  let played = 0;
  let lastRound = 0;
  const errors: string[] = [];
  const t0 = Date.now();

  for (let pass = 0; pass < 500; pass++) {
    const all = await loadMatches();
    const byeCache = buildByeCache(all, tournamentId, tournament.format);
    const ready = all.filter(isReady);
    if (ready.length === 0) break;

    const minRound = Math.min(...ready.map((m) => m.round));
    const batch = ready.filter((m) => m.round === minRound);

    if (verbose && minRound !== lastRound) {
      const broken = await auditAdvances(all, matchCount, maxRound);
      if (broken.length > 0) {
        console.error(`\n❌ Broken advances before R${minRound} (${broken.length}):`);
        for (const b of broken.slice(0, 15)) console.error("  ", b);
        if (broken.length > 15) console.error(`  … +${broken.length - 15}`);
        errors.push(...broken);
      } else {
        console.log(`\n✓ R${lastRound || 1}-${minRound - 1} advances OK`);
      }
      lastRound = minRound;
    }

    if (verbose) {
      console.log(`R${minRound}: playing ${batch.length} matches…`);
    }

    for (const m of batch) {
      try {
        const winnerTeamId = pickWinner(m);
        await advanceWinner(prisma, m.id, winnerTeamId, "FINISHED", byeCache);
        played++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const no = fixedSwissMatchNo(m.round, m.slot, matchCount, maxRound);
        console.error(`  FAIL #${no}: ${msg}`);
        errors.push(`${no}: ${msg}`);
      }
    }

    await processByes(prisma, tournamentId, tournament.format);
  }

  const final = await loadMatches();
  const brokenFinal = await auditAdvances(final, matchCount, maxRound);
  const finished = final.filter(
    (m) => m.winnerTeamId || m.status === "FINISHED",
  ).length;
  const scheduled = final.filter((m) => !m.winnerTeamId).length;
  const playable = final.filter(isReady).length;

  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("\n=== Summary ===");
  console.log(`Played: ${played} (${elapsedSec}s)`);
  console.log(`Finished: ${finished}/${final.length}`);
  console.log(`Still scheduled (no winner): ${scheduled}`);
  console.log(`Ready to play now: ${playable}`);
  console.log(
    `Broken advances: ${brokenFinal.length + errors.filter((e) => e.includes("→")).length}`,
  );

  if (brokenFinal.length > 0) {
    console.error("\n❌ Final broken advances:");
    for (const b of brokenFinal.slice(0, 20)) console.error("  ", b);
    process.exitCode = 1;
  }
  if (errors.length > 0 && process.exitCode !== 1) {
    console.error("\n❌ Save errors:", errors.length);
    process.exitCode = 1;
  }
  if (scheduled > 0 && process.exitCode !== 1) {
    console.error(`\n❌ Deadlock: ${scheduled} matches without winner`);
    process.exitCode = 1;
  }
  if (process.exitCode !== 1) {
    console.log(`\n✅ ${finished}/${final.length} — simulation OK`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
