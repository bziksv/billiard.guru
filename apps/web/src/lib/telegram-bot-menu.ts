import { loadBookableClubsInCity } from "@/lib/telegram-bot-booking";
import {
  BOT_MENU_CLUB_POKATAT,
  startClubPokatatMenu,
  telegramUserHasClubPokatatAccess,
} from "@/lib/telegram-bot-club-pokatat";
import { BOT_MENU_POKATAT, handlePlayerPokatatMenu } from "@/lib/telegram-bot-pokatat";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  getPlayerNotificationPreferencesForCabinet,
  setPlayerNotificationEnabled,
} from "@/lib/notifications/player-preferences-server";
import { playerName, PUBLIC_PARTICIPANT_STATUSES } from "@/lib/public-display";
import { prisma } from "@/lib/prisma";
import { formatRating } from "@/lib/rating";
import {
  buildPublicTournamentStandings,
} from "@/lib/tournament-public-standings";
import type { AdminTournament } from "@/lib/tournament-admin";
import { bookingFormatLabel, formatBookingRange } from "@/lib/table-booking";
import { getNotificationLinkBase } from "@/lib/canonical-site-url";
import {
  answerCallbackQuery,
  contactRequestKeyboard,
  editTelegramMessage,
  parseBookClubDeepLink,
  sendTelegramMessage,
} from "@/lib/telegram";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  USER_ROLE_LABELS,
} from "@/lib/validators";
import type { Player, City, Country } from "@/generated/prisma/client";

export const BOT_MENU_PROFILE = "👤 Мой Профиль";
export const BOT_MENU_TOURNAMENTS = "🏆 Мои турниры";
export const BOT_MENU_BOOKINGS = "🎱 Мои брони / Забронировать";
/** Старые подписи кнопок — распознаём до обновления клавиатуры. */
export const BOT_MENU_BOOKINGS_LEGACY = "🎱 Мои брони";
export const BOT_MENU_BOOK_LEGACY = "📅 Забронировать";
export const BOT_MENU_NOTIFICATIONS = "🔔 Уведомления";
export { BOT_MENU_POKATAT, BOT_MENU_CLUB_POKATAT };

export const BOT_NOTIFY_TOGGLE_PREFIX = "bot_notify_toggle_";
export const BOT_TOURNAMENTS_MORE_PREFIX = "bmt_";

export type BotMenuAction =
  | "profile"
  | "tournaments"
  | "bookings"
  | "pokatat"
  | "club_pokatat"
  | "notifications";

const LIST_LIMIT = 8;
const TOURNAMENTS_PAGE_SIZE = 10;

type PlayerWithCity = Player & {
  city: City & { country: Country };
};

function appUrlBase() {
  return getNotificationLinkBase();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Постоянное меню для подтверждённых игроков (базовое, без проверки клуба). */
export function mainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: BOT_MENU_PROFILE }, { text: BOT_MENU_TOURNAMENTS }],
      [{ text: BOT_MENU_BOOKINGS }],
      [{ text: BOT_MENU_POKATAT }],
      [{ text: BOT_MENU_NOTIFICATIONS }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/** Меню с кнопкой управления клубом, если есть доступ. */
export async function buildMainMenuKeyboard(telegramId: string) {
  const rows: { text: string }[][] = [
    [{ text: BOT_MENU_PROFILE }, { text: BOT_MENU_TOURNAMENTS }],
    [{ text: BOT_MENU_BOOKINGS }],
    [{ text: BOT_MENU_POKATAT }],
  ];
  if (await telegramUserHasClubPokatatAccess(telegramId)) {
    rows.push([{ text: BOT_MENU_CLUB_POKATAT }]);
  }
  rows.push([{ text: BOT_MENU_NOTIFICATIONS }]);
  return {
    keyboard: rows,
    resize_keyboard: true,
    is_persistent: true,
  };
}

export function cabinetInlineKeyboard() {
  return {
    inline_keyboard: [[{ text: "Открыть кабинет", url: `${appUrlBase()}/cabinet` }]],
  };
}

function tournamentsInlineKeyboard(moreOffset: number | null = null) {
  type InlineButton =
    | { text: string; callback_data: string }
    | { text: string; url: string };
  const rows: InlineButton[][] = [];
  if (moreOffset != null) {
    rows.push([
      { text: "⬇️ Показать ещё", callback_data: `${BOT_TOURNAMENTS_MORE_PREFIX}${moreOffset}` },
    ]);
  }
  rows.push([{ text: "Все турниры", url: `${appUrlBase()}/tournaments` }]);
  rows.push([{ text: "Кабинет", url: `${appUrlBase()}/cabinet` }]);
  return { inline_keyboard: rows };
}

function bookingsInlineKeyboard(clubs: { id: string; name: string }[]) {
  type InlineButton =
    | { text: string; callback_data: string }
    | { text: string; url: string };
  const rows: InlineButton[][] = [];
  for (const club of clubs) {
    const label = club.name.length > 28 ? `${club.name.slice(0, 25)}…` : club.name;
    rows.push([{ text: `📍 ${label}`, callback_data: `bk1_${club.id}` }]);
  }
  if (clubs.length === 0) {
    rows.push([{ text: "Клубы на сайте", url: `${appUrlBase()}/clubs` }]);
  } else {
    rows.push([{ text: "📅 Другой клуб города", callback_data: "bk0" }]);
  }
  rows.push([{ text: "Кабинет", url: `${appUrlBase()}/cabinet` }]);
  return { inline_keyboard: rows };
}

export function parseBotMenuAction(text: string): BotMenuAction | null {
  if (parseBookClubDeepLink(text)) return null;

  const trimmed = text.trim();
  if (
    trimmed === BOT_MENU_PROFILE ||
    trimmed === "/profile" ||
    trimmed.startsWith("/profile@")
  ) {
    return "profile";
  }
  if (
    trimmed === BOT_MENU_TOURNAMENTS ||
    trimmed === "/tournaments" ||
    trimmed.startsWith("/tournaments@")
  ) {
    return "tournaments";
  }
  if (
    trimmed === BOT_MENU_BOOKINGS ||
    trimmed === BOT_MENU_BOOKINGS_LEGACY ||
    trimmed === BOT_MENU_BOOK_LEGACY ||
    trimmed === "/bookings" ||
    trimmed.startsWith("/bookings@") ||
    trimmed === "/book" ||
    trimmed.startsWith("/book@")
  ) {
    return "bookings";
  }
  if (
    trimmed === BOT_MENU_POKATAT ||
    trimmed === "/pokatat" ||
    trimmed.startsWith("/pokatat@")
  ) {
    return "pokatat";
  }
  if (trimmed === BOT_MENU_CLUB_POKATAT || trimmed === "/club_pokatat") {
    return "club_pokatat";
  }
  if (
    trimmed === BOT_MENU_NOTIFICATIONS ||
    trimmed === "/notifications" ||
    trimmed.startsWith("/notifications@")
  ) {
    return "notifications";
  }
  return null;
}

/** @deprecated use parseBotMenuAction */
export function isProfileMenuRequest(text: string): boolean {
  return parseBotMenuAction(text) === "profile";
}

export function formatPlayerProfileTelegram(player: PlayerWithCity): string {
  const lines = [
    "👤 <b>Мой профиль</b>",
    "",
    `<b>${escapeHtml(playerName(player))}</b>`,
    `Город: ${escapeHtml(player.city.nameRu)}, ${escapeHtml(player.city.country.nameRu)}`,
    `Телефон: ${escapeHtml(player.phone)}`,
    `Рейтинг: <b>${formatRating(player.rating)}</b>`,
    `Роль: ${escapeHtml(USER_ROLE_LABELS[player.role] ?? player.role)}`,
  ];

  if (player.telegramUsername) {
    lines.push(`Telegram: @${escapeHtml(player.telegramUsername)}`);
  }

  const about = player.about?.trim();
  if (about) {
    const short = about.length > 200 ? `${about.slice(0, 197)}…` : about;
    lines.push("", `О себе: ${escapeHtml(short)}`);
  }

  return lines.join("\n");
}

export async function findVerifiedPlayerByTelegram(telegramId: string) {
  return prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    include: { city: { include: { country: true } } },
  });
}

async function findVerifiedPlayerId(telegramId: string) {
  return prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    select: { id: true },
  });
}

async function sendNotLinkedMessage(telegramId: string) {
  await sendTelegramMessage(
    telegramId,
    "❌ Профиль не найден.\n\nВойдите на billiard.guru/login и подтвердите Telegram — кнопкой ниже или по ссылке из письма.",
    { replyMarkup: contactRequestKeyboard() },
  );
}

export async function sendVerifiedWelcome(
  telegramId: string,
  player: Pick<Player, "lastName" | "firstName">,
): Promise<void> {
  await sendTelegramMessage(
    telegramId,
    `✅ <b>billiard.guru</b>\n\nВы вошли как <b>${escapeHtml(player.lastName)} ${escapeHtml(player.firstName)}</b>.\n\nВыберите пункт меню или откройте сайт.`,
    { replyMarkup: await buildMainMenuKeyboard(telegramId) },
  );
}

function placeMedal(placeLabel: string): string {
  if (placeLabel === "1") return "🥇";
  if (placeLabel === "2") return "🥈";
  if (placeLabel === "3") return "🥉";
  return "🏅";
}

function formatTournamentsTelegram(
  page: Awaited<ReturnType<typeof loadPlayerRegistrations>>,
  total: number,
  offset: number,
  places: Map<string, string>,
): string {
  if (total === 0) {
    return "🏆 <b>Мои турниры</b>\n\nПока нет регистраций.";
  }

  const header =
    offset > 0
      ? `🏆 <b>Мои турниры</b> (${offset + 1}–${offset + page.length} из ${total})`
      : "🏆 <b>Мои турниры</b>";
  const lines = [header, ""];
  for (const r of page) {
    const status = REGISTRATION_STATUS_LABELS[r.status] ?? r.status;
    const format =
      TOURNAMENT_FORMAT_LABELS[r.tournament.format] ?? r.tournament.format;
    const tStatus = TOURNAMENT_STATUS_LABELS[r.tournament.status] ?? r.tournament.status;
    const place = places.get(r.tournament.id);
    const placeSuffix = place ? ` · ${placeMedal(place)} ${escapeHtml(place)} место` : "";
    lines.push(
      `• <b>${escapeHtml(r.tournament.name)}</b>`,
      `  ${escapeHtml(status)} · ${escapeHtml(r.tournament.club.name)}`,
      `  ${escapeHtml(format)} · ${escapeHtml(tStatus)}${placeSuffix}`,
      "",
    );
  }
  return lines.join("\n").trimEnd();
}

function formatBookingsTelegram(
  bookings: Awaited<ReturnType<typeof loadPlayerBookings>>,
): string {
  if (bookings.length === 0) {
    return "🎱 <b>Мои брони</b>\n\nНет предстоящих броней столов.";
  }

  const lines = ["🎱 <b>Мои брони</b>", ""];
  for (const b of bookings.slice(0, LIST_LIMIT)) {
    const status = REGISTRATION_STATUS_LABELS[b.status] ?? b.status;
    lines.push(
      `• <b>${escapeHtml(b.club.name)}</b> — ${escapeHtml(status)}`,
      `  ${escapeHtml(bookingFormatLabel(b.tableFormat))} · ${escapeHtml(formatBookingRange(b.startsAt, b.endsAt))}`,
      "",
    );
  }
  if (bookings.length > LIST_LIMIT) {
    lines.push(`… и ещё ${bookings.length - LIST_LIMIT}. Откройте кабинет.`);
  }
  return lines.join("\n").trimEnd();
}

function formatNotificationsTelegram(
  prefs: Awaited<ReturnType<typeof getPlayerNotificationPreferencesForCabinet>>,
): string {
  const lines = ["🔔 <b>Уведомления</b>", ""];
  if (!prefs.hasTelegram) {
    lines.push("Telegram не привязан.");
    return lines.join("\n");
  }

  for (const group of prefs.groups) {
    lines.push(`<b>${escapeHtml(group.categoryLabel)}</b>`);
    for (const item of group.items) {
      const mark = item.enabled ? "✅" : "❌";
      const lock = item.locked ? " 🔒" : "";
      lines.push(`${mark} ${escapeHtml(item.title)}${lock}`);
    }
    lines.push("");
  }
  lines.push("Нажмите кнопку ниже, чтобы включить или выключить.");
  return lines.join("\n").trimEnd();
}

function notificationsInlineKeyboard(
  prefs: Awaited<ReturnType<typeof getPlayerNotificationPreferencesForCabinet>>,
) {
  type InlineButton =
    | { text: string; callback_data: string }
    | { text: string; url: string };
  const rows: InlineButton[][] = [];
  for (const item of prefs.items) {
    if (item.locked) continue;
    const mark = item.enabled ? "✅" : "❌";
    rows.push([
      {
        text: `${mark} ${item.title}`,
        callback_data: `${BOT_NOTIFY_TOGGLE_PREFIX}${item.id}`,
      },
    ]);
  }
  rows.push([{ text: "Кабинет на сайте", url: `${appUrlBase()}/cabinet` }]);
  return { inline_keyboard: rows };
}

async function loadPlayerRegistrations(playerId: string) {
  return prisma.tournamentRegistration.findMany({
    where: {
      playerId,
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
    include: { tournament: { include: { club: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Занятое игроком место в завершённых турнирах: tournamentId → «1», «5–6». */
async function loadPlayerTournamentPlaces(
  playerId: string,
  tournaments: { id: string; status: string }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const finishedIds = tournaments
    .filter((t) => t.status === "FINISHED")
    .map((t) => t.id);
  if (finishedIds.length === 0) return result;

  const rows = await prisma.tournament.findMany({
    where: { id: { in: finishedIds } },
    include: {
      club: { include: { city: { include: { country: true } } } },
      registrations: {
        where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
        include: { player: { include: { city: true } } },
      },
      teams: {
        where: { status: { in: [...PUBLIC_PARTICIPANT_STATUSES] } },
        include: {
          player1: { include: { city: true } },
          player2: { include: { city: true } },
        },
      },
      matches: {
        include: {
          team1: { include: { player1: true, player2: true } },
          team2: { include: { player1: true, player2: true } },
          winnerTeam: { include: { player1: true, player2: true } },
        },
        orderBy: [{ round: "asc" }, { slot: "asc" }],
      },
    },
  });

  const href = `/players/${playerId}`;
  for (const t of rows) {
    try {
      const standings = buildPublicTournamentStandings(t as unknown as AdminTournament);
      const row = standings.rows.find(
        (r) => r.playerHref === href || r.secondPlayerHref === href,
      );
      if (row?.placeLabel && row.placeLabel !== "—") {
        result.set(t.id, row.placeLabel);
      }
    } catch {
      // протокол не построился — место просто не покажем
    }
  }
  return result;
}

async function loadPlayerBookings(playerId: string) {
  return prisma.tableBooking.findMany({
    where: {
      playerId,
      status: { notIn: ["CANCELLED", "REJECTED"] },
      endsAt: { gte: new Date() },
    },
    include: { club: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" },
  });
}

export async function handleBotMenuAction(
  telegramId: string,
  action: BotMenuAction,
): Promise<void> {
  switch (action) {
    case "profile":
      return handleMyProfile(telegramId);
    case "tournaments":
      return handleMyTournaments(telegramId);
    case "bookings":
      return handleMyBookings(telegramId);
    case "pokatat":
      return handlePlayerPokatatMenu(telegramId);
    case "club_pokatat":
      return startClubPokatatMenu(telegramId);
    case "notifications":
      return handleMyNotifications(telegramId);
  }
}

export async function handleMyProfile(telegramId: string): Promise<void> {
  const player = await findVerifiedPlayerByTelegram(telegramId);
  if (!player) {
    await sendNotLinkedMessage(telegramId);
    return;
  }

  await dispatchNotification(
    "bot-profile-summary",
    telegramId,
    formatPlayerProfileTelegram(player),
    { replyMarkup: cabinetInlineKeyboard() },
  );
}

export async function handleMyTournaments(
  telegramId: string,
  offset = 0,
): Promise<void> {
  const player = await findVerifiedPlayerId(telegramId);
  if (!player) {
    await sendNotLinkedMessage(telegramId);
    return;
  }

  const all = await loadPlayerRegistrations(player.id);
  const start = Math.max(0, offset);
  const page = all.slice(start, start + TOURNAMENTS_PAGE_SIZE);
  const places = await loadPlayerTournamentPlaces(
    player.id,
    page.map((r) => ({ id: r.tournament.id, status: r.tournament.status })),
  );
  const hasMore = start + TOURNAMENTS_PAGE_SIZE < all.length;

  await dispatchNotification(
    "bot-tournaments-summary",
    telegramId,
    formatTournamentsTelegram(page, all.length, start, places),
    { replyMarkup: tournamentsInlineKeyboard(hasMore ? start + TOURNAMENTS_PAGE_SIZE : null) },
  );
}

export async function handleMyTournamentsMoreCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
): Promise<boolean> {
  if (!data.startsWith(BOT_TOURNAMENTS_MORE_PREFIX)) return false;
  const offset = Number.parseInt(data.slice(BOT_TOURNAMENTS_MORE_PREFIX.length), 10);
  await answerCallbackQuery(callbackQueryId);
  await handleMyTournaments(telegramId, Number.isFinite(offset) ? offset : 0);
  return true;
}

export async function handleMyBookings(telegramId: string): Promise<void> {
  const player = await findVerifiedPlayerByTelegram(telegramId);
  if (!player) {
    await sendNotLinkedMessage(telegramId);
    return;
  }

  const bookings = await loadPlayerBookings(player.id);
  const clubs = await loadBookableClubsInCity(player.cityId);
  let text = formatBookingsTelegram(bookings);
  if (clubs.length > 0) {
    text += `\n\n<b>Забронировать в ${escapeHtml(player.city.nameRu)}:</b>`;
  } else {
    text += `\n\nВ ${escapeHtml(player.city.nameRu)} пока нет клубов с онлайн-бронированием.`;
  }

  await dispatchNotification(
    "bot-bookings-summary",
    telegramId,
    text,
    { replyMarkup: bookingsInlineKeyboard(clubs) },
  );
}

export async function handleMyNotifications(telegramId: string): Promise<void> {
  const player = await findVerifiedPlayerId(telegramId);
  if (!player) {
    await sendNotLinkedMessage(telegramId);
    return;
  }

  const prefs = await getPlayerNotificationPreferencesForCabinet(player.id);
  await dispatchNotification(
    "bot-notifications-summary",
    telegramId,
    formatNotificationsTelegram(prefs),
    { replyMarkup: notificationsInlineKeyboard(prefs) },
  );
}

export async function handleNotificationToggleCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<boolean> {
  if (!data.startsWith(BOT_NOTIFY_TOGGLE_PREFIX)) return false;

  const notificationId = data.slice(BOT_NOTIFY_TOGGLE_PREFIX.length);
  const player = await findVerifiedPlayerId(telegramId);
  if (!player) {
    await answerCallbackQuery(callbackQueryId, "Сначала привяжите профиль");
    return true;
  }

  try {
    const prefsBefore = await getPlayerNotificationPreferencesForCabinet(player.id);
    const item = prefsBefore.items.find((i) => i.id === notificationId);
    if (!item || item.locked) {
      await answerCallbackQuery(callbackQueryId, "Нельзя изменить");
      return true;
    }

    await setPlayerNotificationEnabled(player.id, notificationId, !item.enabled);
    const prefs = await getPlayerNotificationPreferencesForCabinet(player.id);
    const text = formatNotificationsTelegram(prefs);
    const keyboard = notificationsInlineKeyboard(prefs);

    if (sourceMessage) {
      await editTelegramMessage(sourceMessage.chatId, sourceMessage.messageId, text, {
        replyMarkup: keyboard,
      });
    } else {
      await sendTelegramMessage(telegramId, text, { replyMarkup: keyboard });
    }

    const updated = prefs.items.find((i) => i.id === notificationId);
    await answerCallbackQuery(
      callbackQueryId,
      updated?.enabled ? "Включено" : "Выключено",
    );
  } catch {
    await answerCallbackQuery(callbackQueryId, "Ошибка сохранения");
  }

  return true;
}
