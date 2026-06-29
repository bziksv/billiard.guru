import type { Prisma } from "@/generated/prisma/client";
import { PUBLIC_TOURNAMENT_STATUSES } from "@/lib/public-display";
import type { GeoSearchParams } from "@/lib/site";

export function resolveGeoForPlayer(
  params: GeoSearchParams,
  playerCityId?: string,
  playerCountryId?: string,
): GeoSearchParams {
  if (params.cityId || params.countryId) return params;
  if (playerCityId) {
    return { cityId: playerCityId, countryId: playerCountryId };
  }
  return {};
}

export const tournamentListOrderBy = [
  { startsAt: { sort: "asc" as const, nulls: "last" as const } },
  { createdAt: "desc" as const },
];

export function clubGeoWhere(params: GeoSearchParams): Prisma.ClubWhereInput {
  if (params.cityId) return { cityId: params.cityId };
  if (params.countryId) return { city: { countryId: params.countryId } };
  return {};
}

export function clubCityIdsWhere(cityIds: string[]): Prisma.ClubWhereInput {
  return { cityId: { in: cityIds } };
}

export const clubListOrderBy = { name: "asc" as const };

export function tournamentGeoWhere(
  params: GeoSearchParams,
): Prisma.TournamentWhereInput {
  return {
    status: { in: [...PUBLIC_TOURNAMENT_STATUSES] },
    ...(params.cityId
      ? { club: { cityId: params.cityId } }
      : params.countryId
        ? { club: { city: { countryId: params.countryId } } }
        : {}),
  };
}

export function tournamentCityIdsWhere(cityIds: string[]): Prisma.TournamentWhereInput {
  return {
    status: { in: [...PUBLIC_TOURNAMENT_STATUSES] },
    club: { cityId: { in: cityIds } },
  };
}

export function playerGeoWhere(
  params: GeoSearchParams,
  options?: { verifiedOnly?: boolean },
): Prisma.PlayerWhereInput {
  const verifiedOnly = options?.verifiedOnly ?? true;
  return {
    ...(verifiedOnly ? { isVerified: true } : {}),
    ...(params.cityId
      ? { cityId: params.cityId }
      : params.countryId
        ? { city: { countryId: params.countryId } }
        : {}),
  };
}

/** Доступные размеры страницы для списка игроков. */
export const PLAYERS_PAGE_SIZES = [100, 200, 500, 1000] as const;
export const PLAYERS_DEFAULT_PAGE_SIZE = 100;

export function normalizePlayersPageSize(raw: string | undefined): number {
  const value = Number(raw);
  return (PLAYERS_PAGE_SIZES as readonly number[]).includes(value)
    ? value
    : PLAYERS_DEFAULT_PAGE_SIZE;
}

/**
 * Умный поиск игрока по имени/фамилии: запрос делится на слова, и каждое
 * слово должно встретиться в имени или фамилии (в любом порядке).
 * «вил ста» находит «Виленский Станислав».
 */
export function playerSearchWhere(
  query: string | undefined,
): Prisma.PlayerWhereInput {
  const tokens = (query ?? "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};
  // MySQL: сравнение строк регистронезависимо по коллации (utf8mb4_*_ci),
  // поэтому отдельный mode: "insensitive" не нужен (и не поддерживается).
  return {
    AND: tokens.map((token) => ({
      OR: [
        { firstName: { contains: token } },
        { lastName: { contains: token } },
      ],
    })),
  };
}

export function coachGeoWhere(params: GeoSearchParams): Prisma.PlayerWhereInput {
  return {
    ...playerGeoWhere(params),
    isCoach: true,
  };
}

export function playListingGeoWhere(params: GeoSearchParams): Prisma.PlayListingWhereInput {
  return {
    status: "OPEN",
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ...(params.cityId
      ? { cityId: params.cityId }
      : params.countryId
        ? { city: { countryId: params.countryId } }
        : {}),
  };
}

export const playListingListInclude = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rating: true,
      photoUrl: true,
      telegramUsername: true,
    },
  },
  city: { include: { country: true } },
  club: { select: { id: true, name: true } },
  _count: { select: { responses: true } },
} satisfies Prisma.PlayListingInclude;

export const playListingListOrderBy = [
  { createdAt: "desc" },
] satisfies Prisma.PlayListingOrderByWithRelationInput[];

export const coachListInclude = {
  city: { include: { country: true } },
} satisfies Prisma.PlayerInclude;

export const coachListOrderBy = [
  { coachReviewCount: "desc" },
  { coachReviewAvg: "desc" },
  { lastName: "asc" },
] satisfies Prisma.PlayerOrderByWithRelationInput[];

export const tournamentListInclude = {
  club: { include: { city: { include: { country: true } } } },
  _count: {
    select: {
      registrations: { where: { status: "CONFIRMED" as const } },
      teams: { where: { status: "CONFIRMED" as const } },
    },
  },
} satisfies Prisma.TournamentInclude;

export const clubListInclude = {
  city: { include: { country: true } },
  _count: { select: { tournaments: true } },
} satisfies Prisma.ClubInclude;
