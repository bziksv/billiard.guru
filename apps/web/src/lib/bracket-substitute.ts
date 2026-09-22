/**
 * Замена игрока mid-bracket (solo): переписываем teamId в незавершённых матчах.
 * Сыгранные матчи и RatingChange ушедшего не трогаем.
 * Факт замены пишем в TournamentPlayerSubstitution для отображения.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { syncSoloTeamsForTournament } from "@/lib/bracket-service";
import { isPairFormat } from "@/lib/pair-tournament";
import { prisma } from "@/lib/prisma";
import {
  parseRewrittenIds,
  type TournamentSubstitutionView,
} from "@/lib/bracket-substitute-display";

export type {
  TournamentSubstitutionView,
} from "@/lib/bracket-substitute-display";
export {
  attachSubstitutionsToMatches,
  formatSubstitutionNotice,
  matchIdsAffectedBySubstitutions,
  substitutionsForMatch,
} from "@/lib/bracket-substitute-display";

type Db = Pick<
  PrismaClient,
  | "tournamentMatch"
  | "tournamentTeam"
  | "tournament"
  | "tournamentRegistration"
  | "player"
  | "clubPlayerRating"
  | "tournamentPlayerSubstitution"
>;

export type SubstituteCandidate = {
  teamId: string;
  playerId: string;
  label: string;
  /** Проиграл хотя бы один матч и сейчас не в незавершённых слотах. */
  kind: "eliminated";
};

export type SubstituteSide = 1 | 2;

/** Команды, проигравшие ≥1 матч и не стоящие в незавершённых слотах. */
export function eliminatedTeamIdsFromMatches(
  matches: {
    team1Id: string | null;
    team2Id: string | null;
    winnerTeamId: string | null;
  }[],
): Set<string> {
  const lost = new Set<string>();
  const activeUnfinished = new Set<string>();

  for (const m of matches) {
    if (m.winnerTeamId) {
      if (m.team1Id && m.team1Id !== m.winnerTeamId) lost.add(m.team1Id);
      if (m.team2Id && m.team2Id !== m.winnerTeamId) lost.add(m.team2Id);
    } else {
      if (m.team1Id) activeUnfinished.add(m.team1Id);
      if (m.team2Id) activeUnfinished.add(m.team2Id);
    }
  }

  const out = new Set<string>();
  for (const id of lost) {
    if (!activeUnfinished.has(id)) out.add(id);
  }
  return out;
}

function playerLabel(p: {
  firstName: string;
  lastName: string;
}): string {
  return [p.lastName, p.firstName].filter(Boolean).join(" ").trim() || "Игрок";
}

export async function listSubstituteCandidates(
  db: Db,
  tournamentId: string,
  opts?: { excludeTeamIds?: string[] },
): Promise<SubstituteCandidate[]> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, isPair: true, format: true },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (tournament.isPair || isPairFormat(tournament.format)) {
    throw new Error("Замена доступна только в одиночных турнирах");
  }

  const matches = await db.tournamentMatch.findMany({
    where: { tournamentId },
    select: { team1Id: true, team2Id: true, winnerTeamId: true },
  });
  const eliminatedIds = eliminatedTeamIdsFromMatches(matches);
  const exclude = new Set(opts?.excludeTeamIds ?? []);

  const teamIds = [...eliminatedIds].filter((id) => !exclude.has(id));
  if (teamIds.length === 0) return [];

  const teams = await db.tournamentTeam.findMany({
    where: {
      id: { in: teamIds },
      tournamentId,
      player2Id: null,
      status: "CONFIRMED",
    },
    include: {
      player1: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return teams.map((t) => ({
    teamId: t.id,
    playerId: t.player1Id,
    label: playerLabel(t.player1),
    kind: "eliminated" as const,
  }));
}

/**
 * Создать/подтвердить заявку и solo-команду для игрока, не участвовавшего (или без команды).
 */
export async function ensureIncomingSoloTeam(
  db: Db,
  tournamentId: string,
  playerId: string,
): Promise<{ teamId: string }> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Турнир не найден");
  if (tournament.isPair || isPairFormat(tournament.format)) {
    throw new Error("Замена доступна только в одиночных турнирах");
  }

  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });
  if (!player) throw new Error("Игрок не найден");

  const existingReg = await db.tournamentRegistration.findUnique({
    where: {
      tournamentId_playerId: { tournamentId, playerId },
    },
  });

  if (!existingReg) {
    await db.tournamentRegistration.create({
      data: {
        tournamentId,
        playerId,
        source: "CLUB",
        status: "CONFIRMED",
        confirmedAt: new Date(),
        feePaid: false,
      },
    });
  } else if (existingReg.status !== "CONFIRMED") {
    await db.tournamentRegistration.update({
      where: { id: existingReg.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
  }

  await syncSoloTeamsForTournament(db, tournament);

  const team = await db.tournamentTeam.findFirst({
    where: {
      tournamentId,
      player1Id: playerId,
      player2Id: null,
      status: "CONFIRMED",
    },
    select: { id: true },
  });
  if (!team) {
    throw new Error("Не удалось создать команду для игрока");
  }
  return { teamId: team.id };
}

export async function substituteTeamInMatch(
  db: Db,
  params: {
    matchId: string;
    side: SubstituteSide;
    incomingTeamId: string;
  },
): Promise<{
  matchId: string;
  outgoingTeamId: string;
  incomingTeamId: string;
  rewrittenMatchIds: string[];
  substitutionId: string;
}> {
  const match = await db.tournamentMatch.findUnique({
    where: { id: params.matchId },
    include: { tournament: true },
  });
  if (!match) throw new Error("Матч не найден");

  const { tournament } = match;
  if (tournament.isPair || isPairFormat(tournament.format)) {
    throw new Error("Замена доступна только в одиночных турнирах");
  }
  if (match.winnerTeamId) {
    throw new Error(
      "Сначала отмените результат встречи — замена только без победителя",
    );
  }

  const outgoingTeamId =
    params.side === 1 ? match.team1Id : match.team2Id;
  if (!outgoingTeamId) {
    throw new Error("В этом слоте нет игрока для замены");
  }
  if (outgoingTeamId === params.incomingTeamId) {
    throw new Error("Игрок уже стоит в этом слоте");
  }

  const [outgoing, incoming] = await Promise.all([
    db.tournamentTeam.findUnique({ where: { id: outgoingTeamId } }),
    db.tournamentTeam.findUnique({ where: { id: params.incomingTeamId } }),
  ]);
  if (!outgoing || outgoing.tournamentId !== match.tournamentId) {
    throw new Error("Уходящая команда не найдена");
  }
  if (!incoming || incoming.tournamentId !== match.tournamentId) {
    throw new Error("Команда не найдена в этом турнире");
  }
  if (incoming.status !== "CONFIRMED") {
    throw new Error("Команда входящего должна быть подтверждена");
  }
  if (incoming.player2Id || outgoing.player2Id) {
    throw new Error("Замена доступна только для одиночных команд");
  }

  const opponentId = params.side === 1 ? match.team2Id : match.team1Id;
  if (opponentId && opponentId === params.incomingTeamId) {
    throw new Error("Нельзя поставить соперника из этой же встречи");
  }

  const activeElsewhere = await db.tournamentMatch.findFirst({
    where: {
      tournamentId: match.tournamentId,
      winnerTeamId: null,
      id: { not: match.id },
      OR: [
        { team1Id: params.incomingTeamId },
        { team2Id: params.incomingTeamId },
      ],
    },
    select: { id: true, round: true, slot: true },
  });
  if (activeElsewhere) {
    throw new Error(
      `Входящий уже в незавершённой встрече (тур ${activeElsewhere.round}, слот ${activeElsewhere.slot})`,
    );
  }

  const unfinished = await db.tournamentMatch.findMany({
    where: {
      tournamentId: match.tournamentId,
      winnerTeamId: null,
      OR: [{ team1Id: outgoingTeamId }, { team2Id: outgoingTeamId }],
    },
    select: { id: true, team1Id: true, team2Id: true },
  });

  const rewrittenMatchIds: string[] = [];
  for (const m of unfinished) {
    const data =
      m.team1Id === outgoingTeamId
        ? { team1Id: params.incomingTeamId }
        : m.team2Id === outgoingTeamId
          ? { team2Id: params.incomingTeamId }
          : null;
    if (!data) continue;
    await db.tournamentMatch.update({
      where: { id: m.id },
      data,
    });
    rewrittenMatchIds.push(m.id);
  }

  if (rewrittenMatchIds.length === 0) {
    throw new Error("Не удалось обновить слот");
  }

  const row = await db.tournamentPlayerSubstitution.create({
    data: {
      tournamentId: match.tournamentId,
      matchId: match.id,
      side: params.side,
      outgoingTeamId,
      incomingTeamId: params.incomingTeamId,
      outgoingPlayerId: outgoing.player1Id,
      incomingPlayerId: incoming.player1Id,
      rewrittenMatchIds,
    },
  });

  return {
    matchId: match.id,
    outgoingTeamId,
    incomingTeamId: params.incomingTeamId,
    rewrittenMatchIds,
    substitutionId: row.id,
  };
}

/** Подтянуть старые замены из audit_logs (до появления таблицы). */
export async function backfillSubstitutionsFromAudit(
  tournamentId: string,
): Promise<number> {
  const existing = await prisma.tournamentPlayerSubstitution.count({
    where: { tournamentId },
  });
  if (existing > 0) return 0;

  const matchIds = (
    await prisma.tournamentMatch.findMany({
      where: { tournamentId },
      select: { id: true },
    })
  ).map((m) => m.id);
  if (matchIds.length === 0) return 0;

  const logs = await prisma.auditLog.findMany({
    where: {
      action: "tournament.bracket.substitute",
      entityType: "tournament_match",
      entityId: { in: matchIds },
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  for (const log of logs) {
    const payload = log.payload as Record<string, unknown> | null;
    if (!payload || !log.entityId) continue;
    const side = payload.side === 2 ? 2 : payload.side === 1 ? 1 : null;
    const outgoingTeamId =
      typeof payload.outgoingTeamId === "string" ? payload.outgoingTeamId : null;
    const incomingTeamId =
      typeof payload.incomingTeamId === "string" ? payload.incomingTeamId : null;
    if (!side || !outgoingTeamId || !incomingTeamId) continue;

    const [outgoing, incoming] = await Promise.all([
      prisma.tournamentTeam.findUnique({
        where: { id: outgoingTeamId },
        select: { player1Id: true },
      }),
      prisma.tournamentTeam.findUnique({
        where: { id: incomingTeamId },
        select: { player1Id: true },
      }),
    ]);
    if (!outgoing || !incoming) continue;

    const rewritten = parseRewrittenIds(payload.rewrittenMatchIds);
    await prisma.tournamentPlayerSubstitution.create({
      data: {
        tournamentId,
        matchId: log.entityId,
        side,
        outgoingTeamId,
        incomingTeamId,
        outgoingPlayerId: outgoing.player1Id,
        incomingPlayerId: incoming.player1Id,
        rewrittenMatchIds: rewritten.length > 0 ? rewritten : [log.entityId],
        createdAt: log.createdAt,
      },
    });
    created += 1;
  }
  return created;
}

export async function listTournamentSubstitutions(
  tournamentId: string,
): Promise<TournamentSubstitutionView[]> {
  await backfillSubstitutionsFromAudit(tournamentId).catch(() => 0);

  const rows = await prisma.tournamentPlayerSubstitution.findMany({
    where: { tournamentId },
    include: {
      outgoingPlayer: { select: { firstName: true, lastName: true } },
      incomingPlayer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    matchId: r.matchId,
    side: r.side === 2 ? 2 : 1,
    outgoingTeamId: r.outgoingTeamId,
    incomingTeamId: r.incomingTeamId,
    outgoingPlayerId: r.outgoingPlayerId,
    outgoingLabel: playerLabel(r.outgoingPlayer),
    incomingPlayerId: r.incomingPlayerId,
    incomingLabel: playerLabel(r.incomingPlayer),
    rewrittenMatchIds: parseRewrittenIds(r.rewrittenMatchIds),
    createdAt: r.createdAt.toISOString(),
  }));
}
