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
  { startsAt: "asc" as const },
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

export function playerGeoWhere(params: GeoSearchParams): Prisma.PlayerWhereInput {
  return {
    isVerified: true,
    ...(params.cityId
      ? { cityId: params.cityId }
      : params.countryId
        ? { city: { countryId: params.countryId } }
        : {}),
  };
}

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
