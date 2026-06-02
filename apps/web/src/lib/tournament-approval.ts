import { randomUUID } from "crypto";
import { writeAuditLog } from "@/lib/audit";
import { clubOwnedByPlayer } from "@/lib/club-access";
import { getNearbyCityIds, NOTIFY_RADIUS_KM } from "@/lib/geo";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  clearInlineKeyboard,
  sendTelegramMessage,
  tournamentApprovalKeyboard,
} from "@/lib/telegram";
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

  await sendTelegramMessage(
    club.telegramId,
    `🏆 <b>Запрос на публикацию турнира</b>\n\n` +
      `Создан турнир от имени вашего клуба «<b>${club.name}</b>»:\n\n` +
      `<b>${tournament.name}</b>\n` +
      `${TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format}\n` +
      `${club.city.nameRu} · ${formatStartsAt(tournament.startsAt)}` +
      descriptionBlock +
      `\n\nПодтвердите публикацию — игрокам в радиусе ${NOTIFY_RADIUS_KM} км уйдёт уведомление.`,
    { replyMarkup: tournamentApprovalKeyboard(token) },
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

  const link = appUrl(`/tournaments/${tournament.id}`);
  const descriptionBlock = tournament.description
    ? `\n${tournament.description.slice(0, 300)}${tournament.description.length > 300 ? "…" : ""}`
    : "";

  let sent = 0;
  for (const player of players) {
    if (!player.telegramId) continue;
    const ok = await sendTelegramMessage(
      player.telegramId,
      `📣 <b>Новый турнир рядом с вами</b>\n\n` +
        `<b>${tournament.name}</b>\n` +
        `Клуб: ${tournament.club.name}, ${origin.nameRu}\n` +
        `${TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format}\n` +
        `${formatStartsAt(tournament.startsAt)}` +
        descriptionBlock +
        `\n\nПодробнее: ${link}`,
    );
    if (ok) sent++;
  }

  logger.info(
    { tournamentId, players: players.length, sent, nearbyCityIds: nearbyCityIds.length },
    "Nearby player notifications sent",
  );

  await writeAuditLog({
    actorType: "system",
    action: "tournament.notify.nearby",
    entityType: "tournament",
    entityId: tournamentId,
    payload: { recipients: players.length, sent, radiusKm: NOTIFY_RADIUS_KM },
  });
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
  return clubOwnedByPlayer(club, player);
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
    return { ok: false, message: "Запрос не найден или уже обработан." };
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

  void notifyNearbyPlayers(tournament.id).catch((err) => {
    logger.error({ err, tournamentId: tournament.id }, "Nearby player notifications failed");
  });

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
    return { ok: false, message: "Запрос не найден или уже обработан." };
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

  // Сразу снимаем «Загрузка…» в Telegram — тяжёлая работа после ответа.
  await answerCallbackQuery(callbackQueryId);

  try {
    const result = approveMatch
      ? await approveTournamentByClub(token, telegramId)
      : await rejectTournamentByClub(token, telegramId);

    if (sourceMessage) {
      await clearInlineKeyboard(sourceMessage.chatId, sourceMessage.messageId);
    }

    await sendTelegramMessage(telegramId, result.message);
    return true;
  } catch (err) {
    logger.error({ err, data, telegramId }, "Tournament approval callback error");
    await sendTelegramMessage(
      telegramId,
      "⚠️ Не удалось обработать запрос. Попробуйте ещё раз или опубликуйте турнир на сайте.",
    );
    return true;
  }
}

export async function handleTournamentApprovalMessage(
  text: string,
  telegramId: string,
): Promise<boolean> {
  const match = text.match(/tournament_approve_([a-f0-9-]+)/i);
  if (!match?.[1]) return false;
  const result = await approveTournamentByClub(match[1], telegramId);
  await sendTelegramMessage(telegramId, result.message);
  return true;
}
