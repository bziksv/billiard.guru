/**
 * Копия турнира с тем же составом, сеткой и зафиксированными результатами.
 *
 *   cd apps/web && npx tsx scripts/duplicate-tournament-bracket.ts --source=cmq3pqcrh002p2g9w5qj7zulf
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { createPrismaClient } from "../src/lib/prisma";
import {
  processByes,
  replayFixedSwissAdvances,
} from "../src/lib/bracket-service";
import { buildFixedSwissTemplate } from "../src/lib/fixed-swiss-grid";
import { buildOlympicBracket } from "../src/lib/pair-tournament";

const SOURCE_ID =
  process.argv
    .find((a) => a.startsWith("--source="))
    ?.split("=")[1] ?? "cmq3pqcrh002p2g9w5qj7zulf";

const NAME_SUFFIX = " — копия (вылет в 1/4)";

async function main() {
  const prisma = createPrismaClient();

  const source = await prisma.tournament.findUnique({
    where: { id: SOURCE_ID },
    include: {
      club: { select: { id: true, name: true } },
      teams: {
        where: { status: "CONFIRMED" },
        orderBy: { seed: "asc" },
      },
      matches: { orderBy: [{ round: "asc" }, { slot: "asc" }] },
      registrations: { where: { status: "CONFIRMED" } },
    },
  });

  if (!source) throw new Error(`Турнир ${SOURCE_ID} не найден`);
  if (source.matches.length === 0) {
    throw new Error("У исходного турнира нет сетки — сначала сформируйте её");
  }

  const existingCopy = await prisma.tournament.findFirst({
    where: { name: `${source.name}${NAME_SUFFIX}`, clubId: source.clubId },
    select: { id: true },
  });
  if (existingCopy) {
    await prisma.tournament.delete({ where: { id: existingCopy.id } });
    console.log(`Удалена прежняя копия (${existingCopy.id})`);
  }

  const copy = await prisma.tournament.create({
    data: {
      name: `${source.name}${NAME_SUFFIX}`,
      description:
        source.description ??
        `Копия ${source.id}: тот же состав и результаты; проигравшие 1/8 уходят в нижнюю тур 4.`,
      clubId: source.clubId,
      format: source.format,
      status: "DRAFT",
      handicapHalfStep: source.handicapHalfStep,
      ratingMax: source.ratingMax,
      ratingSource: source.ratingSource,
      publishedAt: new Date(),
    },
  });

  const now = new Date();
  if (source.registrations.length > 0) {
    await prisma.tournamentRegistration.createMany({
      data: source.registrations.map((r) => ({
        tournamentId: copy.id,
        playerId: r.playerId,
        clubId: r.clubId ?? source.clubId,
        source: r.source,
        status: "CONFIRMED" as const,
        confirmedAt: r.confirmedAt ?? now,
      })),
      skipDuplicates: true,
    });
  }

  const oldTeamBySeed = new Map(
    source.teams
      .filter((t): t is typeof t & { seed: number } => t.seed != null)
      .map((t) => [t.seed, t]),
  );

  const newTeams = await Promise.all(
    source.teams.map((team) =>
      prisma.tournamentTeam.create({
        data: {
          tournamentId: copy.id,
          player1Id: team.player1Id,
          player2Id: team.player2Id,
          name: team.name,
          clubId: team.clubId ?? source.clubId,
          source: team.source,
          status: "CONFIRMED",
          confirmedAt: team.confirmedAt ?? now,
          seed: team.seed,
          swissPoints: team.swissPoints,
        },
      }),
    ),
  );

  const newTeamBySeed = new Map(
    newTeams
      .filter((t): t is typeof t & { seed: number } => t.seed != null)
      .map((t) => [t.seed, t.id]),
  );

  const oldTeamToNew = new Map<string, string>();
  for (const [seed, oldTeam] of oldTeamBySeed) {
    const newId = newTeamBySeed.get(seed);
    if (newId) oldTeamToNew.set(oldTeam.id, newId);
  }

  const seededTeamIds = [...newTeams]
    .filter((t): t is typeof t & { seed: number } => t.seed != null)
    .sort((a, b) => a.seed - b.seed)
    .map((t) => t.id);

  const template = buildFixedSwissTemplate(seededTeamIds.length, source.format);
  const bracket = buildOlympicBracket(seededTeamIds);
  const round1BySlot = new Map(
    bracket.filter((m) => m.round === 1).map((m) => [m.slot, m]),
  );

  await prisma.tournamentMatch.createMany({
    data: template.matches.map((m) => {
      const r1 = m.round === 1 ? round1BySlot.get(m.slot) : null;
      return {
        tournamentId: copy.id,
        round: m.round,
        slot: m.slot,
        team1Id: r1?.team1Id ?? null,
        team2Id: r1?.team2Id ?? null,
      };
    }),
  });

  await processByes(prisma, copy.id, source.format);
  await prisma.tournament.update({
    where: { id: copy.id },
    data: { status: "ACTIVE" },
  });

  const newMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: copy.id },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });
  const newMatchByKey = new Map(
    newMatches.map((m) => [`${m.round}:${m.slot}`, m]),
  );

  for (const m of source.matches) {
    if (!m.winnerTeamId) continue;
    const dest = newMatchByKey.get(`${m.round}:${m.slot}`);
    if (!dest) continue;

    const winnerTeamId = oldTeamToNew.get(m.winnerTeamId);
    if (!winnerTeamId) {
      throw new Error(
        `Не найдена новая команда для победителя ${m.winnerTeamId} (тур ${m.round}, слот ${m.slot})`,
      );
    }

    await prisma.tournamentMatch.update({
      where: { id: dest.id },
      data: {
        winnerTeamId,
        team1Score: m.team1Score,
        team2Score: m.team2Score,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        status: m.status,
      },
    });
  }

  await replayFixedSwissAdvances(prisma, copy.id);

  const scheduledWithTime = source.matches.filter(
    (m) => !m.winnerTeamId && (m.startedAt || m.finishedAt),
  );
  for (const m of scheduledWithTime) {
    const dest = newMatchByKey.get(`${m.round}:${m.slot}`);
    if (!dest) continue;
    await prisma.tournamentMatch.update({
      where: { id: dest.id },
      data: {
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
      },
    });
  }

  await prisma.tournament.update({
    where: { id: copy.id },
    data: { status: source.status },
  });

  const finished = source.matches.filter((m) => m.winnerTeamId).length;
  console.log(`Клуб: ${source.club?.name} (${source.clubId})`);
  console.log(`Исходный: ${source.name} (${source.id})`);
  console.log(`Копия:    ${copy.name} (${copy.id})`);
  console.log(`Формат:   ${copy.format}, команд: ${newTeams.length}, результатов: ${finished}`);
  console.log(`Админка:  http://localhost:3010/admin/tournaments/${copy.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = createPrismaClient();
    await prisma.$disconnect();
  });
