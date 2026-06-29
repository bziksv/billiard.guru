import { prisma } from "@/lib/prisma";
import { disciplineGroupKey } from "@/lib/tournament-discipline";

export type DisciplineStat = {
  /** Стабильный ключ группы (discipline[:gameType]). */
  key: string;
  discipline: string;
  gameType: string | null;
  played: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgDurationMin: number | null;
};

export type RivalStat = {
  playerId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  firstNameLatin: string | null;
  lastNameLatin: string | null;
  middleNameLatin: string | null;
  played: number;
  wins: number;
  losses: number;
  winRate: number | null;
};

export type PlayerMatchStats = {
  /** Решённые встречи с двумя соперниками (без BYE). */
  played: number;
  /** Количество турниров, где сыграна хотя бы одна встреча. */
  tournamentsPlayed: number;
  wins: number;
  losses: number;
  /** Доля побед 0..1, null если нет сыгранных встреч. */
  winRate: number | null;
  /** Среднее время встречи в минутах (по встречам с временем), null если нет данных. */
  avgDurationMin: number | null;
  /** Сколько из сыгранных встреч пришлось на парные команды. */
  pairGames: number;
  /** Разбивка по дисциплинам (только турниры с заданным типом игры). */
  byDiscipline: DisciplineStat[];
  /** Соперники, которых чаще обыгрываешь (положительный баланс). */
  topWins: RivalStat[];
  /** Соперники, которым чаще проигрываешь (отрицательный баланс). */
  topLosses: RivalStat[];
};

export const EMPTY_PLAYER_STATS: PlayerMatchStats = {
  played: 0,
  tournamentsPlayed: 0,
  wins: 0,
  losses: 0,
  winRate: null,
  avgDurationMin: null,
  pairGames: 0,
  byDiscipline: [],
  topWins: [],
  topLosses: [],
};

/** Минимум личных встреч с соперником, чтобы попасть в «соперники». */
const MIN_RIVAL_GAMES = 2;
/** Сколько соперников показывать в каждом списке. */
const RIVALS_LIMIT = 5;

const MAX_REASONABLE_MATCH_MS = 24 * 60 * 60 * 1000;

/**
 * Сводная статистика игрока по сыгранным встречам.
 * Игрок учитывается через команды (player1 или player2), поэтому парные игры
 * автоматически входят в общую статистику обоих партнёров.
 */
export async function computePlayerMatchStats(
  playerId: string,
): Promise<PlayerMatchStats> {
  const teams = await prisma.tournamentTeam.findMany({
    where: { OR: [{ player1Id: playerId }, { player2Id: playerId }] },
    select: { id: true, player2Id: true },
  });
  if (teams.length === 0) return EMPTY_PLAYER_STATS;

  const teamIds = new Set(teams.map((t) => t.id));
  const pairTeamIds = new Set(
    teams.filter((t) => t.player2Id).map((t) => t.id),
  );

  const opponentPlayerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    middleName: true,
    firstNameLatin: true,
    lastNameLatin: true,
    middleNameLatin: true,
  } as const;
  const opponentSelect = {
    player1: { select: opponentPlayerSelect },
    player2: { select: opponentPlayerSelect },
  } as const;

  const matches = await prisma.tournamentMatch.findMany({
    where: {
      status: { in: ["FINISHED", "WALKOVER"] },
      winnerTeamId: { not: null },
      OR: [
        { team1Id: { in: [...teamIds] } },
        { team2Id: { in: [...teamIds] } },
      ],
    },
    select: {
      tournamentId: true,
      team1Id: true,
      team2Id: true,
      winnerTeamId: true,
      startedAt: true,
      finishedAt: true,
      tournament: { select: { discipline: true, gameType: true } },
      team1: { select: opponentSelect },
      team2: { select: opponentSelect },
    },
  });

  let played = 0;
  let wins = 0;
  let losses = 0;
  let pairGames = 0;
  const durationsMs: number[] = [];
  const tournamentIds = new Set<string>();

  type Group = {
    discipline: string;
    gameType: string | null;
    played: number;
    wins: number;
    losses: number;
    durations: number[];
  };
  const groups = new Map<string, Group>();

  type Rival = {
    firstName: string;
    lastName: string;
    middleName: string | null;
    firstNameLatin: string | null;
    lastNameLatin: string | null;
    middleNameLatin: string | null;
    wins: number;
    losses: number;
  };
  const rivals = new Map<string, Rival>();

  for (const m of matches) {
    if (!m.team1Id || !m.team2Id) continue; // BYE / неполная встреча — не считаем
    const myIsTeam1 = teamIds.has(m.team1Id);
    const myIsTeam2 = teamIds.has(m.team2Id);
    if (!myIsTeam1 && !myIsTeam2) continue;
    const myTeamId = myIsTeam1 ? m.team1Id : m.team2Id;

    const won = m.winnerTeamId === myTeamId;
    played += 1;
    if (m.tournamentId) tournamentIds.add(m.tournamentId);
    if (won) wins += 1;
    else losses += 1;
    if (pairTeamIds.has(myTeamId)) pairGames += 1;

    let durationMs: number | null = null;
    if (m.startedAt && m.finishedAt) {
      const ms = m.finishedAt.getTime() - m.startedAt.getTime();
      if (ms > 0 && ms < MAX_REASONABLE_MATCH_MS) {
        durationMs = ms;
        durationsMs.push(ms);
      }
    }

    const discipline = m.tournament?.discipline ?? null;
    if (discipline) {
      const gameType = m.tournament?.gameType ?? null;
      const key = disciplineGroupKey(discipline, gameType);
      const group =
        groups.get(key) ??
        { discipline, gameType, played: 0, wins: 0, losses: 0, durations: [] };
      group.played += 1;
      if (won) group.wins += 1;
      else group.losses += 1;
      if (durationMs != null) group.durations.push(durationMs);
      groups.set(key, group);
    }

    // Соперники из команды-оппонента
    const opponentTeam = myIsTeam1 ? m.team2 : m.team1;
    const opponentPlayers = [opponentTeam?.player1, opponentTeam?.player2];
    for (const op of opponentPlayers) {
      if (!op || op.id === playerId) continue;
      const r = rivals.get(op.id) ?? {
        firstName: op.firstName,
        lastName: op.lastName,
        middleName: op.middleName,
        firstNameLatin: op.firstNameLatin,
        lastNameLatin: op.lastNameLatin,
        middleNameLatin: op.middleNameLatin,
        wins: 0,
        losses: 0,
      };
      if (won) r.wins += 1;
      else r.losses += 1;
      rivals.set(op.id, r);
    }
  }

  if (played === 0) return EMPTY_PLAYER_STATS;

  const avgDurationMin =
    durationsMs.length > 0
      ? Math.round(
          durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 60000,
        )
      : null;

  const byDiscipline: DisciplineStat[] = [...groups.entries()]
    .map(([key, g]) => ({
      key,
      discipline: g.discipline,
      gameType: g.gameType,
      played: g.played,
      wins: g.wins,
      losses: g.losses,
      winRate: g.played > 0 ? g.wins / g.played : null,
      avgDurationMin:
        g.durations.length > 0
          ? Math.round(
              g.durations.reduce((a, b) => a + b, 0) / g.durations.length / 60000,
            )
          : null,
    }))
    .sort((a, b) => b.played - a.played);

  const allRivals: RivalStat[] = [...rivals.entries()].map(([playerId, r]) => {
    const total = r.wins + r.losses;
    return {
      playerId,
      firstName: r.firstName,
      lastName: r.lastName,
      middleName: r.middleName,
      firstNameLatin: r.firstNameLatin,
      lastNameLatin: r.lastNameLatin,
      middleNameLatin: r.middleNameLatin,
      played: total,
      wins: r.wins,
      losses: r.losses,
      winRate: total > 0 ? r.wins / total : null,
    };
  });

  const topWins = allRivals
    .filter((r) => r.played >= MIN_RIVAL_GAMES && r.wins > r.losses)
    .sort((a, b) => b.wins - b.losses - (a.wins - a.losses) || b.wins - a.wins)
    .slice(0, RIVALS_LIMIT);

  const topLosses = allRivals
    .filter((r) => r.played >= MIN_RIVAL_GAMES && r.losses > r.wins)
    .sort(
      (a, b) => b.losses - b.wins - (a.losses - a.wins) || b.losses - a.losses,
    )
    .slice(0, RIVALS_LIMIT);

  return {
    played,
    tournamentsPlayed: tournamentIds.size,
    wins,
    losses,
    winRate: wins / played,
    avgDurationMin,
    pairGames,
    byDiscipline,
    topWins,
    topLosses,
  };
}

export type PlayerWinRate = {
  played: number;
  wins: number;
  /** Доля побед 0..1, null если нет сыгранных встреч. */
  winRate: number | null;
};

/**
 * Пакетный расчёт процента побед для списка игроков (для рейтинговой таблицы).
 * Делает 2 запроса вне зависимости от числа игроков. Парные встречи
 * засчитываются обоим участникам команды.
 */
export async function computeWinRatesForPlayers(
  playerIds: string[],
): Promise<Map<string, PlayerWinRate>> {
  const result = new Map<string, PlayerWinRate>();
  if (playerIds.length === 0) return result;

  const idSet = new Set(playerIds);
  const teams = await prisma.tournamentTeam.findMany({
    where: {
      OR: [{ player1Id: { in: playerIds } }, { player2Id: { in: playerIds } }],
    },
    select: { id: true, player1Id: true, player2Id: true },
  });
  if (teams.length === 0) return result;

  const teamToPlayers = new Map<string, string[]>();
  for (const tm of teams) {
    const members: string[] = [];
    if (idSet.has(tm.player1Id)) members.push(tm.player1Id);
    if (tm.player2Id && idSet.has(tm.player2Id)) members.push(tm.player2Id);
    if (members.length > 0) teamToPlayers.set(tm.id, members);
  }
  const teamIds = [...teamToPlayers.keys()];
  if (teamIds.length === 0) return result;

  const matches = await prisma.tournamentMatch.findMany({
    where: {
      status: { in: ["FINISHED", "WALKOVER"] },
      winnerTeamId: { not: null },
      OR: [{ team1Id: { in: teamIds } }, { team2Id: { in: teamIds } }],
    },
    select: { team1Id: true, team2Id: true, winnerTeamId: true },
  });

  const agg = new Map<string, { played: number; wins: number }>();
  const bump = (pid: string, won: boolean) => {
    const a = agg.get(pid) ?? { played: 0, wins: 0 };
    a.played += 1;
    if (won) a.wins += 1;
    agg.set(pid, a);
  };

  for (const m of matches) {
    if (!m.team1Id || !m.team2Id) continue; // BYE — не считаем
    for (const teamId of [m.team1Id, m.team2Id]) {
      const members = teamToPlayers.get(teamId);
      if (!members) continue;
      const won = m.winnerTeamId === teamId;
      for (const pid of members) bump(pid, won);
    }
  }

  for (const [pid, a] of agg) {
    result.set(pid, {
      played: a.played,
      wins: a.wins,
      winRate: a.played > 0 ? a.wins / a.played : null,
    });
  }
  return result;
}
