import { clubOwnedByPlayer } from "@/lib/club-access";
import { getNotificationLinkBase } from "@/lib/canonical-site-url";
import { listClubsManagedByPlayer, playerCanManageClub } from "@/lib/club-staff";
import {
  countClubPendingPlayResponses,
  loadClubPlayListingsManage,
} from "@/lib/play-listing-manage";
import {
  formatPlayListingSchedule,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_STATUS_LABELS,
} from "@/lib/play-listing-display";
import { formatRating } from "@/lib/rating";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

function appUrlBase() {
  return getNotificationLinkBase();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const BOT_MENU_CLUB_POKATAT = "🏢 Покатать (клуб)";

export function clubPokatatMenuKeyboard() {
  return {
    keyboard: [[{ text: BOT_MENU_CLUB_POKATAT }], [{ text: "🌐 Управление на сайте" }]],
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function findVerifiedClubByTelegram(telegramId: string) {
  return prisma.club.findFirst({
    where: { telegramId, isVerified: true },
    select: { id: true, name: true, cityId: true },
  });
}

async function findVerifiedPlayerByTelegram(telegramId: string) {
  return prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    select: { id: true, phone: true, telegramId: true },
  });
}

export async function listTelegramManagedClubs(telegramId: string) {
  const directClub = await findVerifiedClubByTelegram(telegramId);
  if (directClub) {
    return [{ id: directClub.id, name: directClub.name, city: { nameRu: "" } }];
  }

  const player = await findVerifiedPlayerByTelegram(telegramId);
  if (!player) return [];
  return listClubsManagedByPlayer(player);
}

async function assertCanManageClub(clubId: string, telegramId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, phone: true, telegramId: true, cityId: true },
  });
  if (!club) return null;

  if (club.telegramId === telegramId) return club;

  const player = await findVerifiedPlayerByTelegram(telegramId);
  if (player && (await playerCanManageClub(club, player))) return club;

  return null;
}

function clubPickerKeyboard(clubs: { id: string; name: string }[]) {
  return {
    inline_keyboard: clubs.map((c) => [
      {
        text: c.name.length > 36 ? `${c.name.slice(0, 33)}…` : c.name,
        callback_data: `plm1_${c.id}`,
      },
    ]),
  };
}

function formatPendingResponseBlock(
  listingTitle: string,
  player: { firstName: string; lastName: string; rating: number },
  message: string | null,
): string {
  return [
    `📌 <b>${escapeHtml(listingTitle)}</b>`,
    `👤 ${escapeHtml(player.lastName)} ${escapeHtml(player.firstName)} · ${formatRating(player.rating)}`,
    message ? `💬 ${escapeHtml(message)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function startClubPokatatMenu(telegramId: string): Promise<void> {
  const clubs = await listTelegramManagedClubs(telegramId);
  if (clubs.length === 0) {
    await sendTelegramMessage(
      telegramId,
      "🏢 <b>Покатать (клуб)</b>\n\nКлуб не привязан к этому Telegram.\n\nПодтвердите клуб на сайте или войдите как сотрудник.",
    );
    return;
  }

  if (clubs.length === 1) {
    await showClubPokatatHub(telegramId, clubs[0]!.id);
    return;
  }

  await sendTelegramMessage(telegramId, "🏢 <b>Покатать</b>\n\nВыберите клуб:", {
    replyMarkup: clubPickerKeyboard(clubs),
  });
}

export async function showClubPokatatHub(
  telegramId: string,
  clubId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<void> {
  const club = await assertCanManageClub(clubId, telegramId);
  if (!club) {
    await sendTelegramMessage(telegramId, "❌ Нет доступа к этому клубу.");
    return;
  }

  const payload = await loadClubPlayListingsManage(clubId);
  const pending = payload.clubListings.flatMap((l) =>
    (l.responses ?? [])
      .filter((r) => r.status === "PENDING")
      .map((r) => ({ listing: l, response: r })),
  );

  const lines = [
    `🏢 <b>Покатать — ${escapeHtml(club.name)}</b>`,
    "",
    `⏳ Ожидают ответа: <b>${payload.stats.pendingResponses}</b>`,
    `📢 Наши объявления: ${payload.stats.clubActive} активных`,
    `👥 От игроков у клуба: ${payload.stats.playerActive}`,
    "",
  ];

  if (pending.length === 0) {
    lines.push("Новых откликов нет.");
  } else {
    lines.push("<b>Новые отклики:</b>", "");
    for (const { listing, response } of pending.slice(0, 5)) {
      lines.push(
        formatPendingResponseBlock(listing.title, response.player, response.message),
        "",
      );
    }
    if (pending.length > 5) {
      lines.push(`… и ещё ${pending.length - 5}.`);
    }
  }

  type InlineButton =
    | { text: string; callback_data: string }
    | { text: string; url: string };
  const rows: InlineButton[][] = [];

  for (const { listing, response } of pending.slice(0, 3)) {
    rows.push([
      {
        text: `✅ ${response.player.firstName}`,
        callback_data: `plm3_${listing.id}_${response.id}_a`,
      },
      {
        text: "❌",
        callback_data: `plm3_${listing.id}_${response.id}_d`,
      },
    ]);
  }

  rows.push([
    { text: "🔄 Обновить", callback_data: `plm1_${clubId}` },
    { text: "📋 Объявления", callback_data: `plm4_${clubId}` },
  ]);
  rows.push([{ text: "➕ Опубликовать на сайте", url: `${appUrlBase()}/pokatat?tab=create` }]);

  const text = lines.join("\n").trimEnd();
  const keyboard = { inline_keyboard: rows };

  if (sourceMessage) {
    await editTelegramMessage(sourceMessage.chatId, sourceMessage.messageId, text, {
      replyMarkup: keyboard,
    });
  } else {
    await sendTelegramMessage(telegramId, text, { replyMarkup: keyboard });
  }
}

async function showClubListings(
  telegramId: string,
  clubId: string,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const club = await assertCanManageClub(clubId, telegramId);
  if (!club) return;

  const payload = await loadClubPlayListingsManage(clubId);
  const lines = [`📋 <b>Объявления — ${escapeHtml(club.name)}</b>`, ""];

  if (payload.clubListings.length === 0 && payload.playerListings.length === 0) {
    lines.push("Пока нет объявлений, связанных с клубом.");
  }

  for (const l of payload.clubListings.slice(0, 6)) {
    lines.push(
      `• <b>${escapeHtml(l.title)}</b> — ${escapeHtml(PLAY_LISTING_STATUS_LABELS[l.status] ?? l.status)}`,
      `  ${escapeHtml(formatPlayListingSchedule(l))}`,
      l.pendingResponseCount > 0
        ? `  ⏳ ${l.pendingResponseCount} откл.`
        : "",
      "",
    );
  }

  for (const l of payload.playerListings.slice(0, 4)) {
    lines.push(
      `• 👤 ${escapeHtml(l.title)}`,
      `  ${escapeHtml(l.author.lastName)} ${escapeHtml(l.author.firstName)} · ${escapeHtml(formatPlayListingSchedule(l))}`,
      "",
    );
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "← Назад", callback_data: `plm1_${clubId}` }],
      [{ text: "На сайте", url: `${appUrlBase()}/pokatat?cityId=${club.cityId}` }],
    ],
  };

  const text = lines.join("\n").trimEnd();
  if (sourceMessage) {
    await editTelegramMessage(sourceMessage.chatId, sourceMessage.messageId, text, {
      replyMarkup: keyboard,
    });
  } else {
    await sendTelegramMessage(telegramId, text, { replyMarkup: keyboard });
  }
}

async function updateResponse(
  telegramId: string,
  listingId: string,
  responseId: string,
  accept: boolean,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
) {
  const listing = await prisma.playListing.findUnique({
    where: { id: listingId },
    select: { clubId: true, publishedByClub: true, title: true },
  });
  if (!listing?.clubId || !listing.publishedByClub) {
    await answerCallbackQuery(callbackQueryId, "Объявление не найдено");
    return;
  }

  const club = await assertCanManageClub(listing.clubId, telegramId);
  if (!club) {
    await answerCallbackQuery(callbackQueryId, "Нет доступа");
    return;
  }

  const response = await prisma.playListingResponse.findUnique({
    where: { id: responseId },
  });
  if (!response || response.listingId !== listingId || response.status !== "PENDING") {
    await answerCallbackQuery(callbackQueryId, "Отклик уже обработан");
    return;
  }

  const status = accept ? "ACCEPTED" : "DECLINED";
  await prisma.playListingResponse.update({
    where: { id: responseId },
    data: { status },
  });
  if (accept) {
    await prisma.playListing.update({
      where: { id: listingId },
      data: { status: "MATCHED" },
    });
  }

  await answerCallbackQuery(callbackQueryId, accept ? "Принято" : "Отклонено");
  await showClubPokatatHub(telegramId, listing.clubId, sourceMessage);
}

export async function handleClubPokatatCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<boolean> {
  if (!data.startsWith("plm")) return false;

  if (data === "plm0") {
    await startClubPokatatMenu(telegramId);
    await answerCallbackQuery(callbackQueryId);
    return true;
  }

  if (data.startsWith("plm1_")) {
    const clubId = data.slice("plm1_".length);
    await showClubPokatatHub(telegramId, clubId, sourceMessage);
    await answerCallbackQuery(callbackQueryId);
    return true;
  }

  if (data.startsWith("plm4_")) {
    const clubId = data.slice("plm4_".length);
    await showClubListings(telegramId, clubId, sourceMessage);
    await answerCallbackQuery(callbackQueryId);
    return true;
  }

  if (data.startsWith("plm3_")) {
    const match = /^plm3_(.+)_(.+)_([ad])$/.exec(data);
    if (!match) {
      await answerCallbackQuery(callbackQueryId, "Ошибка данных");
      return true;
    }
    const [, listingId, responseId, action] = match;
    await updateResponse(
      telegramId,
      listingId,
      responseId,
      action === "a",
      callbackQueryId,
      sourceMessage,
    );
    return true;
  }

  return false;
}

export async function telegramUserHasClubPokatatAccess(telegramId: string): Promise<boolean> {
  const clubs = await listTelegramManagedClubs(telegramId);
  return clubs.length > 0;
}

export async function countPendingForTelegramClub(telegramId: string): Promise<number> {
  const clubs = await listTelegramManagedClubs(telegramId);
  let total = 0;
  for (const c of clubs) {
    total += await countClubPendingPlayResponses(c.id);
  }
  return total;
}
