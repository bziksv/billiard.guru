/**
 * Strip secrets / PII from API JSON. Never expose confirmToken to clients
 * except via dedicated confirm-state endpoints for owners/admins.
 */

const PLAYER_SECRET_KEYS = [
  "confirmToken",
] as const;

const CLUB_SECRET_KEYS = [
  "confirmToken",
] as const;

function omitKeys<T extends Record<string, unknown>>(
  row: T,
  keys: readonly string[],
): Omit<T, (typeof keys)[number]> {
  const out = { ...row };
  for (const key of keys) {
    delete out[key];
  }
  return out as Omit<T, (typeof keys)[number]>;
}

export function sanitizePlayer<T extends Record<string, unknown>>(player: T) {
  return omitKeys(player, PLAYER_SECRET_KEYS);
}

export function sanitizeClub<T extends Record<string, unknown>>(club: T) {
  return omitKeys(club, CLUB_SECRET_KEYS);
}

/**
 * Manage GET/PATCH club for staff: drop owner-binding secrets.
 * Owners/SA still get phone/email/telegramId (token always stripped).
 */
export function sanitizeClubForManager<T extends Record<string, unknown>>(
  club: T,
  options: { isOwnerOrSa: boolean },
) {
  const base = sanitizeClub(club);
  if (options.isOwnerOrSa) return base;
  const {
    phone: _p,
    email: _e,
    telegramId: _tg,
    ...rest
  } = base as Record<string, unknown>;
  return rest as Omit<T, "confirmToken" | "phone" | "email" | "telegramId">;
}

/** Nested player on teams/registrations/matches. */
export function sanitizePlayerDeep(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizePlayerDeep);
  if (typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "confirmToken") continue;
    if (
      k === "player" ||
      k === "player1" ||
      k === "player2" ||
      k === "author" ||
      k === "registrations" ||
      k === "teams" ||
      k === "matches" ||
      k === "team1" ||
      k === "team2" ||
      k === "winnerTeam"
    ) {
      next[k] = sanitizePlayerDeep(v);
      continue;
    }
    next[k] = v;
  }
  if ("phone" in obj || "telegramId" in obj || "firstName" in obj) {
    return sanitizePlayer(next as Record<string, unknown>);
  }
  return next;
}

export function sanitizeTournamentListPayload(tournaments: unknown) {
  return sanitizePlayerDeep(tournaments);
}

/** Anonymous / marketing club list (pokatat filters). */
export function toPublicClubListItem(club: {
  id: string;
  name: string;
  nameLatin?: string | null;
  cityId: string;
  isVerified: boolean;
  photoUrl?: string | null;
  city?: unknown;
}) {
  return {
    id: club.id,
    name: club.name,
    nameLatin: club.nameLatin ?? null,
    cityId: club.cityId,
    isVerified: club.isVerified,
    photoUrl: club.photoUrl ?? null,
    city: club.city ?? null,
  };
}

export function toPublicClubDetail(club: Record<string, unknown> & {
  news?: Array<Record<string, unknown> & { status?: string }>;
}) {
  const {
    confirmToken: _t,
    phone: _p,
    email: _e,
    telegramId: _tg,
    displayPhone: _dp,
    floorPlan: _fp,
    news,
    ...rest
  } = club;
  const approvedNews = Array.isArray(news)
    ? news.filter((n) => n.status === "APPROVED")
    : [];
  return {
    ...rest,
    news: approvedNews,
  };
}
