import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaSql } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { isPrismaClientSchemaMismatchError } from "@/lib/prisma-schema-mismatch";
import { PUBLIC_TOURNAMENT_STATUSES } from "@/lib/public-display";
import {
  tournamentCityIdsWhere,
  tournamentGeoWhere,
  tournamentListInclude,
  tournamentListOrderBy,
} from "@/lib/public-queries";
import type { GeoSearchParams } from "@/lib/site";

export type PublicTournamentListItem = Prisma.TournamentGetPayload<{
  include: typeof tournamentListInclude;
}> & {
  format: string;
};

type RawTournamentListRow = {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  starts_at: Date | null;
  club_id: string;
  club_name: string;
  city_name_ru: string;
  country_name_ru: string | null;
  reg_count: bigint | number;
  team_count: bigint | number;
};

function mapRawListRow(row: RawTournamentListRow): PublicTournamentListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    format: row.format,
    status: row.status,
    clubId: row.club_id,
    startsAt: row.starts_at,
    club: {
      id: row.club_id,
      name: row.club_name,
      city: {
        nameRu: row.city_name_ru,
        country: row.country_name_ru ? { nameRu: row.country_name_ru } : null,
      },
    },
    _count: {
      registrations: Number(row.reg_count),
      teams: Number(row.team_count),
    },
  } as PublicTournamentListItem;
}

function publicStatusSql() {
  return PrismaSql.join(
    PUBLIC_TOURNAMENT_STATUSES.map((status) => PrismaSql.sql`${status}`),
  );
}

async function findPublicTournamentsListRaw(options: {
  geo?: GeoSearchParams;
  cityIds?: string[];
  take?: number;
}): Promise<PublicTournamentListItem[]> {
  const geo = options.geo ?? {};
  let geoFilter = PrismaSql.empty;
  if (options.cityIds && options.cityIds.length > 0) {
    geoFilter = PrismaSql.sql`AND c.city_id IN (${PrismaSql.join(options.cityIds)})`;
  } else if (geo.cityId) {
    geoFilter = PrismaSql.sql`AND c.city_id = ${geo.cityId}`;
  } else if (geo.countryId) {
    geoFilter = PrismaSql.sql`AND ci.country_id = ${geo.countryId}`;
  }

  const limitSql =
    options.take != null ? PrismaSql.sql`LIMIT ${options.take}` : PrismaSql.empty;

  const rows = await prisma.$queryRaw<RawTournamentListRow[]>(PrismaSql.sql`
    SELECT
      t.id,
      t.name,
      t.description,
      CAST(t.format AS CHAR) AS format,
      CAST(t.status AS CHAR) AS status,
      t.starts_at,
      t.club_id,
      c.name AS club_name,
      ci.name_ru AS city_name_ru,
      co.name_ru AS country_name_ru,
      (
        SELECT COUNT(*)
        FROM tournament_registrations r
        WHERE r.tournament_id = t.id AND r.status = 'CONFIRMED'
      ) AS reg_count,
      (
        SELECT COUNT(*)
        FROM tournament_teams tm
        WHERE tm.tournament_id = t.id AND tm.status = 'CONFIRMED'
      ) AS team_count
    FROM tournaments t
    INNER JOIN clubs c ON c.id = t.club_id
    INNER JOIN cities ci ON ci.id = c.city_id
    LEFT JOIN countries co ON co.id = ci.country_id
    WHERE t.status IN (${publicStatusSql()})
    ${geoFilter}
    ORDER BY t.starts_at IS NULL, t.starts_at ASC, t.created_at DESC
    ${limitSql}
  `);

  return rows.map(mapRawListRow);
}

/**
 * Public tournament lists: Prisma first, raw SQL fallback if deployed client
 * does not know a format/status enum value already present in MySQL.
 */
export async function findPublicTournamentsList(options: {
  geo?: GeoSearchParams;
  cityIds?: string[];
  take?: number;
}): Promise<PublicTournamentListItem[]> {
  const where =
    options.cityIds && options.cityIds.length > 0
      ? tournamentCityIdsWhere(options.cityIds)
      : tournamentGeoWhere(options.geo ?? {});

  try {
    return await prisma.tournament.findMany({
      where,
      include: tournamentListInclude,
      orderBy: tournamentListOrderBy,
      ...(options.take != null ? { take: options.take } : {}),
    });
  } catch (error) {
    if (!isPrismaClientSchemaMismatchError(error)) throw error;
    logger.warn(
      { err: error, geo: options.geo, cityIds: options.cityIds },
      "Public tournament list: schema mismatch, raw SQL fallback",
    );
    return findPublicTournamentsListRaw(options);
  }
}

type RawTournamentBaseRow = {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  club_id: string;
  rating_max: number | null;
  rating_source: string;
  handicap_half_step: number | boolean;
  suppress_notifications: number | boolean;
  table_ids: unknown;
  table_streams: unknown;
  starts_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

async function fetchTournamentBaseRaw(id: string): Promise<RawTournamentBaseRow | null> {
  const rows = await prisma.$queryRaw<RawTournamentBaseRow[]>(PrismaSql.sql`
    SELECT
      t.id,
      t.name,
      t.description,
      CAST(t.format AS CHAR) AS format,
      CAST(t.status AS CHAR) AS status,
      t.club_id,
      t.rating_max,
      CAST(t.rating_source AS CHAR) AS rating_source,
      t.handicap_half_step,
      t.suppress_notifications,
      t.table_ids,
      t.table_streams,
      t.starts_at,
      t.created_at,
      t.updated_at
    FROM tournaments t
    WHERE t.id = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function asBool(value: number | boolean): boolean {
  return value === true || value === 1;
}

async function loadPublicTournamentRelations<T extends Prisma.TournamentInclude>(
  id: string,
  clubId: string,
  include: T,
): Promise<Omit<Prisma.TournamentGetPayload<{ include: T }>, keyof RawTournamentBaseRow>> {
  const out: Record<string, unknown> = {};

  const tasks: Promise<void>[] = [];

  if (include.club) {
    tasks.push(
      prisma.club
        .findUnique({
          where: { id: clubId },
          include:
            typeof include.club === "object" && include.club.include
              ? include.club.include
              : undefined,
        })
        .then((club) => {
          out.club = club;
        }),
    );
  }

  if (include.registrations) {
    const regInclude =
      typeof include.registrations === "object" ? include.registrations : undefined;
    tasks.push(
      prisma.tournamentRegistration
        .findMany({
          where: { tournamentId: id, ...(regInclude?.where ?? {}) },
          include:
            typeof regInclude?.include === "object" ? regInclude.include : undefined,
          orderBy: regInclude?.orderBy,
        })
        .then((registrations) => {
          out.registrations = registrations;
        }),
    );
  }

  if (include.teams) {
    const teamInclude = typeof include.teams === "object" ? include.teams : undefined;
    tasks.push(
      prisma.tournamentTeam
        .findMany({
          where: { tournamentId: id, ...(teamInclude?.where ?? {}) },
          include:
            typeof teamInclude?.include === "object" ? teamInclude.include : undefined,
          orderBy: teamInclude?.orderBy,
        })
        .then((teams) => {
          out.teams = teams;
        }),
    );
  }

  if (include.matches) {
    const matchInclude = typeof include.matches === "object" ? include.matches : undefined;
    tasks.push(
      prisma.tournamentMatch
        .findMany({
          where: { tournamentId: id, ...(matchInclude?.where ?? {}) },
          include:
            typeof matchInclude?.include === "object" ? matchInclude.include : undefined,
          orderBy: matchInclude?.orderBy,
        })
        .then((matches) => {
          out.matches = matches;
        }),
    );
  }

  await Promise.all(tasks);
  return out as Omit<Prisma.TournamentGetPayload<{ include: T }>, keyof RawTournamentBaseRow>;
}

async function findPublicTournamentByIdRaw<T extends Prisma.TournamentInclude>(
  id: string,
  include: T,
): Promise<Prisma.TournamentGetPayload<{ include: T }> | null> {
  const base = await fetchTournamentBaseRaw(id);
  if (!base) return null;

  const relations = await loadPublicTournamentRelations(id, base.club_id, include);

  return {
    ...relations,
    id: base.id,
    name: base.name,
    description: base.description,
    format: base.format,
    status: base.status,
    clubId: base.club_id,
    ratingMax: base.rating_max,
    ratingSource: base.rating_source,
    handicapHalfStep: asBool(base.handicap_half_step),
    suppressNotifications: asBool(base.suppress_notifications),
    tableIds: base.table_ids,
    tableStreams: base.table_streams,
    startsAt: base.starts_at,
    createdAt: base.created_at,
    updatedAt: base.updated_at,
    clubApprovalToken: null,
    publishedAt: null,
  } as Prisma.TournamentGetPayload<{ include: T }>;
}

/** Single public tournament: survives unknown `format` enum on older deployed builds. */
export async function findPublicTournamentById<T extends Prisma.TournamentInclude>(
  id: string,
  include: T,
): Promise<Prisma.TournamentGetPayload<{ include: T }> | null> {
  try {
    return await prisma.tournament.findUnique({ where: { id }, include });
  } catch (error) {
    if (!isPrismaClientSchemaMismatchError(error)) throw error;
    logger.warn({ err: error, id }, "Public tournament: schema mismatch, raw SQL fallback");
    return findPublicTournamentByIdRaw(id, include);
  }
}
