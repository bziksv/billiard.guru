/**
 * Переключить турнир на FIXED_SWISS_256R8_1_3_mesto с N тест-игроками (остальное — кресты).
 *
 *   npx tsx scripts/setup-tournament-256-with-byes.ts [tournamentId] [count]
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateTournamentPairing } from "../src/lib/bracket-service";

const LOCK_PATH = resolve(__dirname, "../.tmp/setup-tournament-256.lock");

function createScriptPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const normalized = raw.replace(/^mysql:\/\//, "mariadb://");
  const url = new URL(normalized);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 1,
    connectTimeout: 30_000,
    allowPublicKeyRetrieval: true,
  });
  return new PrismaClient({ adapter });
}

function acquireLock(): void {
  mkdirSync(resolve(__dirname, "../.tmp"), { recursive: true });
  if (existsSync(LOCK_PATH)) {
    const pid = readFileSync(LOCK_PATH, "utf8").trim();
    try {
      process.kill(Number(pid), 0);
      throw new Error(
        `Скрипт уже запущен (pid ${pid}). Дождитесь завершения или удалите ${LOCK_PATH}`,
      );
    } catch (e) {
      if (e instanceof Error && e.message.includes("Скрипт уже")) throw e;
      rmSync(LOCK_PATH, { force: true });
    }
  }
  writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock(): void {
  rmSync(LOCK_PATH, { force: true });
}

const tournamentId = process.argv[2] ?? "cmqf3zlvf00003i3kcusdpfnz";
const PARTICIPANTS = Number(process.argv[3] ?? "198");
const FORMAT = "FIXED_SWISS_256R8_1_3_mesto" as const;
const GRID_SIZE = 256;

function testPlayerNumber(lastName: string): number {
  const m = /^Тест(\d+)$/.exec(lastName);
  return m ? Number(m[1]) : 9999;
}

async function main() {
  if (!Number.isFinite(PARTICIPANTS) || PARTICIPANTS < 2 || PARTICIPANTS > GRID_SIZE) {
    throw new Error(`count must be 2..${GRID_SIZE}, got ${PARTICIPANTS}`);
  }

  acquireLock();
  const prisma = createScriptPrismaClient();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, format: true, clubId: true },
  });
  if (!tournament) throw new Error(`Tournament ${tournamentId} not found`);

  console.log(`Tournament: ${tournament.name} (${tournament.format})`);

  await prisma.bracketFormatConfig.upsert({
    where: { formatCode: FORMAT },
    create: {
      formatCode: FORMAT,
      enabled: true,
      participantMin: 2,
      participantMax: GRID_SIZE,
      participantExact: null,
    },
    update: {
      participantMin: 2,
      participantMax: GRID_SIZE,
      participantExact: null,
    },
  });

  const testPlayers = await prisma.player.findMany({
    where: { lastName: { startsWith: "Тест" } },
    select: { id: true, lastName: true, firstName: true, rating: true },
  });
  testPlayers.sort(
    (a, b) => testPlayerNumber(a.lastName) - testPlayerNumber(b.lastName),
  );

  if (testPlayers.length < PARTICIPANTS) {
    throw new Error(
      `Need ${PARTICIPANTS} test players (lastName Тест*), found ${testPlayers.length}`,
    );
  }
  const selected = testPlayers.slice(0, PARTICIPANTS);
  console.log(
    `Players: ${selected[0]!.lastName} … ${selected[selected.length - 1]!.lastName} (${selected.length})`,
  );

  await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });

  await prisma.tournamentTeam.updateMany({
    where: { tournamentId },
    data: { status: "CANCELLED" },
  });

  await prisma.tournamentRegistration.deleteMany({ where: { tournamentId } });

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { format: FORMAT, status: "OPEN" },
  });

  const now = new Date();
  await prisma.tournamentRegistration.createMany({
    data: selected.map((p) => ({
      tournamentId,
      playerId: p.id,
      clubId: tournament.clubId,
      source: "CLUB" as const,
      status: "CONFIRMED" as const,
      confirmedAt: now,
    })),
  });

  await generateTournamentPairing(prisma, tournamentId);

  const matchCount = await prisma.tournamentMatch.count({
    where: { tournamentId },
  });
  const round1 = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round: 1 },
    select: { team1Id: true, team2Id: true, winnerTeamId: true, status: true },
  });
  const byes = round1.filter(
    (m) =>
      (m.team1Id && !m.team2Id) ||
      (!m.team1Id && m.team2Id),
  );
  const realMatches = round1.filter((m) => m.team1Id && m.team2Id);
  const empty = round1.filter((m) => !m.team1Id && !m.team2Id);

  const teams = await prisma.tournamentTeam.count({
    where: { tournamentId, status: "CONFIRMED" },
  });

  console.log(`\nFormat: ${FORMAT}`);
  console.log(`Confirmed teams: ${teams}`);
  console.log(`Matches total: ${matchCount} (expected 496)`);
  console.log(`Round 1: ${round1.length} slots`);
  console.log(`  real pairs: ${realMatches.length}`);
  console.log(`  byes (кресты): ${byes.length} (expected ${GRID_SIZE - PARTICIPANTS})`);
  console.log(`  empty: ${empty.length}`);
  console.log(`  bye winners set: ${byes.filter((m) => m.winnerTeamId).length}`);

  if (matchCount !== 496) {
    throw new Error(`Expected 496 matches, got ${matchCount}`);
  }
  if (teams !== PARTICIPANTS) {
    throw new Error(`Expected ${PARTICIPANTS} teams, got ${teams}`);
  }
  if (byes.length !== GRID_SIZE - PARTICIPANTS) {
    throw new Error(
      `Expected ${GRID_SIZE - PARTICIPANTS} byes, got ${byes.length}`,
    );
  }

  console.log(`\n✅ Ready: http://localhost:3010/admin/tournaments/${tournamentId}`);
  await prisma.$disconnect();
  releaseLock();
}

main().catch((e) => {
  console.error(e);
  releaseLock();
  process.exit(1);
});
