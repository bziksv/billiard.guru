import { randomUUID } from "crypto";
import { writeAuditLog } from "@/lib/audit";
import { playerCanManageClub } from "@/lib/club-staff";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import { logger } from "@/lib/logger";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { writeTelegramDeliveryLog } from "@/lib/notifications/delivery-log";
import {
  getNotificationGlobalSettings,
  resolveMassTelegramRecipients,
} from "@/lib/notifications/settings-server";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  clearInlineKeyboard,
  sendTelegramMessage,
  tournamentApprovalKeyboard,
} from "@/lib/telegram";
import { formatRating } from "@/lib/rating";
import { filterPlayersByTournamentRatingMax } from "@/lib/tournament-rating-limit-server";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";

function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return `${base.replace(/\/$/, "")}${path}`;
}

function formatStartsAt(date: Date | null): string {
  if (!date) return "дата уточняется";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadTournamentForApproval(tournamentId: string) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      club: { include: { city: { include: { country: true } } } },
    },
  });
}

export async function requestClubTournamentApproval(tournamentId: string) {
  const tournament = await loadTournamentForApproval(tournamentId);
  if (!tournament) throw new Error("Турнир не найден");

  const club = tournament.club;
  if (!club.isVerified || !club.telegramId) {
    throw new Error(
      "Клуб не подтверждён в Telegram. Владелец клуба должен сначала привязать бота.",
    );
  }

  const token = randomUUID();
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "PENDING_CLUB_APPROVAL",
      clubApprovalToken: token,
      publishedAt: null,
    },
  });

  const descriptionBlock = tournament.description
    ? `\n\n${tournament.description.slice(0, 500)}${tournament.description.length > 500 ? "…" : ""}`
    : "";
  const ratingBlock =
    tournament.ratingMax != null
      ? `\nРейтинг участников: до ${formatRating(tournament.ratingMax)} (сначала клубный, иначе общий).`
      : "";

  await sendTelegramMessage(
    club.telegramId,
    `🏆 <b>Запрос на публикацию турнира</b>\n\n` +
      `Создан турнир от имени вашего клуба «<b>${club.name}</b>»:\n\n` +
      `<b>${tournament.name}</b>\n` +
      `${TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format}\n` +
      `${club.city.nameRu} · ${formatStartsAt(tournament.startsAt)}` +
      ratingBlock +
      descriptionBlock +
      `\n\nПодтвердите публикацию — игрокам в радиусе ${NOTIFY_RADIUS_KM} км с подходящим рейтингом уйдёт уведомление.`,
    { replyMarkup: tournamentApprovalKeyboard(token) },
    {
      notificationId: "tournament-approval-request",
      context: "tournament-approval-request",
      entityType: "tournament",
      entityId: tournamentId,
    },
  );

  await writeAuditLog({
    actorType: "club",
    actorId: club.id,
    action: "tournament.approval.requested",
    entityType: "tournament",
    entityId: tournamentId,
  });

  logger.info({ tournamentId, clubId: club.id }, "Club approval requested");
}

async function notifyNearbyPlayers(tournamentId: string) {
  const batchId = randomUUID();
  const tournament = await loadTournamentForApproval(tournamentId);
  if (!tournament) return;

  const origin = tournament.club.city;
  const allCities = await prisma.city.findMany({
    select: { id: true, latitude: true, longitude: true },
  });
  const nearbyCityIds = getNearbyCityIds(origin, allCities, NOTIFY_RADIUS_KM);

  const players = await prisma.player.findMany({
    where: {
      cityId: { in: nearbyCityIds },
      isVerified: true,
      telegramId: { not: null },
    },
    include: { city: true },
  });

  const { eligible: ratingEligiblePlayers, skippedByRating } =
    await filterPlayersByTournamentRatingMax(
      players,
      tournament.clubId,
      tournament.ratingMax,
    );
  const ratingEligibleIds = new Set(ratingEligiblePlayers.map((p) => p.id));

  const link = appUrl(`/tournaments/${tournament.id}`);
  const descriptionBlock = tournament.description
    ? `\n${tournament.description.slice(0, 300)}${tournament.description.length > 300 ? "…" : ""}`
    : "";

  const ratingAnnounce =
    tournament.ratingMax != null
      ? `\nРейтинг: до ${formatRating(tournament.ratingMax)}.`
      : "";

  const fallbackText =
    `📣 <b>Новый турнир рядом с вами</b>\n\n` +
    `<b>${tournament.name}</b>\n` +
    `Клуб: ${tournament.club.name}, ${origin.nameRu}\n` +
    `${TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format}\n` +
    `${formatStartsAt(tournament.startsAt)}` +
    ratingAnnounce +
    descriptionBlock +
    `\n\nПодробнее: ${link}`;

  const ratingMaxLabel =
    tournament.ratingMax != null ? formatRating(tournament.ratingMax) : "";

  const templateVars = {
    tournamentName: tournament.name,
    clubName: tournament.club.name,
    cityName: origin.nameRu,
    format: TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format,
    startsAt: formatStartsAt(tournament.startsAt),
    description: tournament.description?.slice(0, 300) ?? "",
    link,
    radiusKm: String(NOTIFY_RADIUS_KM),
    ratingMax: ratingMaxLabel,
  };

  const intended = ratingEligiblePlayers
    .filter((p) => p.telegramId)
    .map((p) => ({ playerId: p.id, telegramId: p.telegramId! }));

  const recipients = await resolveMassTelegramRecipients(
    "tournament-nearby-announce",
    intended,
  );
  const recipientSet = new Set(recipients.map((r) => r.telegramId));
  const global = await getNotificationGlobalSettings();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const player of players) {
    if (!player.telegramId) {
      skipped += 1;
      await writeTelegramDeliveryLog({
        notificationId: "tournament-nearby-announce",
        context: "tournament-nearby-announce",
        status: "skipped",
        skipReason: "no_telegram",
        playerId: player.id,
        entityType: "tournament",
        entityId: tournamentId,
        batchId,
      });
      continue;
    }

    if (!ratingEligibleIds.has(player.id)) {
      skipped += 1;
      await writeTelegramDeliveryLog({
        notificationId: "tournament-nearby-announce",
        context: "tournament-nearby-announce",
        status: "skipped",
        skipReason: "rating_above_max",
        chatId: player.telegramId,
        playerId: player.id,
        entityType: "tournament",
        entityId: tournamentId,
        batchId,
      });
      continue;
    }

    if (!recipientSet.has(player.telegramId)) {
      skipped += 1;
      await writeTelegramDeliveryLog({
        notificationId: "tournament-nearby-announce",
        context: "tournament-nearby-announce",
        status: "skipped",
        skipReason: global.testModeEnabled ? "test_mode" : "not_in_radius",
        chatId: player.telegramId,
        playerId: player.id,
        entityType: "tournament",
        entityId: tournamentId,
        batchId,
        messagePreview: fallbackText,
      });
      continue;
    }

    const ok = await dispatchNotification(
      "tournament-nearby-announce",
      player.telegramId,
      fallbackText,
      undefined,
      {
        playerId: player.id,
        templateVars,
        batchId,
        entityType: "tournament",
        entityId: tournamentId,
      },
    );
    if (ok) sent += 1;
    else failed += 1;
  }

  logger.info(
    {
      tournamentId,
      batchId,
      playersInRadius: players.length,
      ratingEligible: ratingEligiblePlayers.length,
      skippedByRating,
      sent,
      failed,
      skipped,
      nearbyCityIds: nearbyCityIds.length,
      testMode: global.testModeEnabled,
    },
    "Nearby player notifications finished",
  );

  await writeAuditLog({
    actorType: "system",
    action: "tournament.notify.nearby",
    entityType: "tournament",
    entityId: tournamentId,
    summary: `Рассылка «турнир рядом»: отправлено ${sent}, ошибок ${failed}, пропущено ${skipped}${skippedByRating > 0 ? ` (рейтинг: ${skippedByRating})` : ""}`,
    payload: {
      batchId,
      recipients: players.length,
      ratingEligible: ratingEligiblePlayers.length,
      skippedByRating,
      ratingMax: tournament.ratingMax,
      sent,
      failed,
      skipped,
      radiusKm: NOTIFY_RADIUS_KM,
      testMode: global.testModeEnabled,
    },
  });

  return { batchId, sent, failed, skipped };
}

async function canApproveTournamentClub(
  club: { id: string; phone: string; telegramId: string | null },
  telegramId: string,
): Promise<boolean> {
  if (club.telegramId === telegramId) return true;

  const player = await prisma.player.findFirst({
    where: { telegramId, isVerified: true },
    select: { id: true, phone: true, telegramId: true, role: true },
  });
  return playerCanManageClub(club, player);
}

export async function approveTournamentByClub(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const tournament = await prisma.tournament.findFirst({
    where: { clubApprovalToken: token },
    include: { club: true },
  });

  if (!tournament) {
    return {
      ok: false,
      message:
        "Запрос уже обработан. Если вы опубликовали турнир на сайте — всё в порядке, кнопку можно не нажимать.",
    };
  }
  if (tournament.status !== "PENDING_CLUB_APPROVAL") {
    return { ok: false, message: "Турнир уже опубликован или отклонён." };
  }
  if (!(await canApproveTournamentClub(tournament.club, telegramId))) {
    return {
      ok: false,
      message: "Подтвердить может только владелец клуба в Telegram.",
    };
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      status: "OPEN",
      publishedAt: new Date(),
      clubApprovalToken: null,
    },
  });

  await writeAuditLog({
    actorType: "club",
    actorId: tournament.clubId,
    action: "tournament.approval.confirmed",
    entityType: "tournament",
    entityId: tournament.id,
  });

  try {
    await notifyNearbyPlayers(tournament.id);
  } catch (err) {
    logger.error({ err, tournamentId: tournament.id }, "Nearby player notifications failed");
  }

  return {
    ok: true,
    message: `✅ Турнир «${tournament.name}» опубликован на billiard.guru.\nУведомления игрокам поблизости отправляются.`,
  };
}

export async function rejectTournamentByClub(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const tournament = await prisma.tournament.findFirst({
    where: { clubApprovalToken: token },
    include: { club: true },
  });

  if (!tournament) {
    return {
      ok: false,
      message:
        "Запрос уже обработан. Если вы опубликовали турнир на сайте — всё в порядке, кнопку можно не нажимать.",
    };
  }
  if (tournament.status !== "PENDING_CLUB_APPROVAL") {
    return { ok: false, message: "Турнир уже обработан." };
  }
  if (!(await canApproveTournamentClub(tournament.club, telegramId))) {
    return { ok: false, message: "Отклонить может только владелец клуба." };
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      status: "DRAFT",
      clubApprovalToken: null,
    },
  });

  await writeAuditLog({
    actorType: "club",
    actorId: tournament.clubId,
    action: "tournament.approval.rejected",
    entityType: "tournament",
    entityId: tournament.id,
  });

  return {
    ok: true,
    message: `❌ Публикация турнира «${tournament.name}» отклонена.`,
  };
}

export async function handleTournamentApprovalCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
  sourceMessage?: { chatId: string; messageId: number },
): Promise<boolean> {
  const approveMatch = data.match(/^tournament_approve_([a-f0-9-]+)$/i);
  const rejectMatch = data.match(/^tournament_reject_([a-f0-9-]+)$/i);
  const token = approveMatch?.[1] ?? rejectMatch?.[1];
  if (!token) return false;

  await answerCallbackQuery(callbackQueryId);

  let result: { ok: boolean; message: string };
  try {
    result = approveMatch
      ? await approveTournamentByClub(token, telegramId)
      : await rejectTournamentByClub(token, telegramId);
  } catch (err) {
    logger.error({ err, data, telegramId }, "Tournament approval callback error");
    await sendTelegramMessage(
      telegramId,
      "⚠️ Не удалось обработать запрос. Опубликуйте турнир в кабинете клуба на сайте или повторите позже.",
    );
    return true;
  }

  if (sourceMessage) {
    try {
      await clearInlineKeyboard(sourceMessage.chatId, sourceMessage.messageId);
    } catch (err) {
      logger.warn({ err, telegramId }, "clearInlineKeyboard after tournament approval failed");
    }
  }

  await sendTelegramMessage(telegramId, result.message, undefined, {
    notificationId: "tournament-approval-response",
    context: "tournament-approval-response",
  });
  return true;
}

/** Публикация из кабинета клуба (без кнопки в Telegram). */
export async function publishTournamentFromManage(
  tournamentId: string,
  playerId: string,
): Promise<{ ok: boolean; message: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { club: true },
  });
  if (!tournament) {
    return { ok: false, message: "Турнир не найден." };
  }
  if (tournament.status !== "PENDING_CLUB_APPROVAL") {
    return { ok: false, message: "Турнир уже опубликован или отклонён." };
  }
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, phone: true, telegramId: true, role: true },
  });
  if (!player || !(await playerCanManageClub(tournament.club, player))) {
    return { ok: false, message: "Нет прав на публикацию этого турнира." };
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      status: "OPEN",
      publishedAt: new Date(),
      clubApprovalToken: null,
    },
  });

  await writeAuditLog({
    actorType: "player",
    actorId: playerId,
    action: "tournament.approval.confirmed",
    entityType: "tournament",
    entityId: tournament.id,
    clubId: tournament.clubId,
  });

  try {
    await notifyNearbyPlayers(tournament.id);
  } catch (err) {
    logger.error({ err, tournamentId: tournament.id }, "Nearby player notifications failed");
  }

  return {
    ok: true,
    message: `✅ Турнир «${tournament.name}» опубликован.`,
  };
}

export async function handleTournamentApprovalMessage(
  text: string,
  telegramId: string,
): Promise<boolean> {
  const match = text.match(/tournament_approve_([a-f0-9-]+)/i);
  if (!match?.[1]) return false;
  const result = await approveTournamentByClub(match[1], telegramId);
  await sendTelegramMessage(telegramId, result.message, undefined, {
    notificationId: "tournament-approval-response",
    context: "tournament-approval-response",
  });
  return true;
}
