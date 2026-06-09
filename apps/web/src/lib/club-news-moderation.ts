import { randomUUID } from "crypto";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  answerCallbackQuery,
  clubNewsModerationKeyboard,
  sendTelegramMessage,
} from "@/lib/telegram";

function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return `${base.replace(/\/$/, "")}${path}`;
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function getSuperadminTelegramIds(): Promise<string[]> {
  const fromEnv = process.env.TELEGRAM_ADMIN_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  const admins = await prisma.player.findMany({
    where: { role: "SUPERADMIN", isVerified: true, telegramId: { not: null } },
    select: { telegramId: true },
  });
  return admins.map((a) => a.telegramId!).filter(Boolean);
}

async function findSuperadminByTelegram(telegramId: string) {
  return prisma.player.findFirst({
    where: { telegramId, role: "SUPERADMIN", isVerified: true },
  });
}

async function loadClubNews(newsId: string) {
  return prisma.clubNews.findUnique({
    where: { id: newsId },
    include: {
      club: {
        include: { city: { include: { country: true } } },
      },
      author: true,
    },
  });
}

async function notifyAdminsAboutPendingNews(newsId: string) {
  const item = await loadClubNews(newsId);
  if (!item?.moderationToken) return;

  const adminIds = await getSuperadminTelegramIds();
  const link = appUrl("/admin/club-news");
  const authorLine = item.author
    ? `Отправил: ${item.author.lastName} ${item.author.firstName}`
    : "Автор не указан";

  for (const telegramId of adminIds) {
    await sendTelegramMessage(
      telegramId,
      `📰 <b>Новость клуба на модерации</b>\n\n` +
        `<b>${item.title}</b>\n\n` +
        `${truncate(item.body, 400)}\n\n` +
        `Клуб: ${item.club.name} (${item.club.city.nameRu})\n` +
        `${authorLine}\n\n` +
        `Модерация: ${link}`,
      { replyMarkup: clubNewsModerationKeyboard(item.moderationToken) },
    );
  }

  logger.info({ newsId, admins: adminIds.length }, "Club news moderation requested");
}

async function notifyClubAboutDecision(
  item: NonNullable<Awaited<ReturnType<typeof loadClubNews>>>,
  approved: boolean,
  rejectReason?: string | null,
) {
  const reasonBlock = rejectReason?.trim()
    ? `\n\nПричина: ${truncate(rejectReason.trim(), 300)}`
    : "";
  const text = approved
    ? `✅ <b>Новость опубликована</b>\n\n` +
      `«<b>${item.title}</b>» прошла модерацию и видна на сайте.\n\n` +
      `Смотреть: ${appUrl(`/clubs/${item.clubId}#club-news`)}`
    : `❌ <b>Новость не прошла модерацию</b>\n\n` +
      `«<b>${item.title}</b>» отклонена.${reasonBlock}`;

  const recipients = new Set<string>();
  if (item.club.telegramId) recipients.add(item.club.telegramId);
  if (item.author?.telegramId) recipients.add(item.author.telegramId);

  for (const telegramId of recipients) {
    await sendTelegramMessage(telegramId, text);
  }
}

export async function submitClubNewsForModeration(input: {
  clubId: string;
  authorId: string;
  title: string;
  body: string;
  autoApprove?: boolean;
}) {
  const token = randomUUID();
  const item = await prisma.clubNews.create({
    data: {
      clubId: input.clubId,
      authorId: input.authorId,
      title: input.title.trim(),
      body: input.body.trim(),
      status: input.autoApprove ? "APPROVED" : "PENDING",
      moderationToken: input.autoApprove ? null : token,
      publishedAt: input.autoApprove ? new Date() : null,
    },
  });

  if (!input.autoApprove) {
    try {
      await notifyAdminsAboutPendingNews(item.id);
    } catch (error) {
      logger.error({ error, newsId: item.id }, "Club news admin notify failed");
    }
  }

  return item;
}

export async function approveClubNews(
  token: string,
  moderatorId: string,
): Promise<{ ok: boolean; message: string }> {
  const item = await prisma.clubNews.findFirst({
    where: { moderationToken: token },
  });

  if (!item) {
    return { ok: false, message: "Новость не найдена или уже обработана." };
  }
  if (item.status !== "PENDING") {
    return { ok: false, message: "Новость уже модерирована." };
  }

  await prisma.clubNews.update({
    where: { id: item.id },
    data: {
      status: "APPROVED",
      moderationToken: null,
      moderatedAt: new Date(),
      moderatedById: moderatorId,
      rejectReason: null,
      publishedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: moderatorId,
    action: "club.news.approve",
    entityType: "club_news",
    entityId: item.id,
    section: "news",
    clubId: item.clubId,
    summary: `Одобрено: ${item.title}`,
  });

  const full = await loadClubNews(item.id);
  if (full) await notifyClubAboutDecision(full, true);

  return {
    ok: true,
    message: `✅ Новость «${item.title}» опубликована. Клуб уведомлён.`,
  };
}

export async function rejectClubNews(
  token: string,
  moderatorId: string,
  rejectReason?: string | null,
): Promise<{ ok: boolean; message: string }> {
  const item = await prisma.clubNews.findFirst({
    where: { moderationToken: token },
  });

  if (!item) {
    return { ok: false, message: "Новость не найдена или уже обработана." };
  }
  if (item.status !== "PENDING") {
    return { ok: false, message: "Новость уже модерирована." };
  }

  await prisma.clubNews.update({
    where: { id: item.id },
    data: {
      status: "REJECTED",
      moderationToken: null,
      moderatedAt: new Date(),
      moderatedById: moderatorId,
      rejectReason: rejectReason?.trim() || null,
    },
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: moderatorId,
    action: "club.news.reject",
    entityType: "club_news",
    entityId: item.id,
    section: "news",
    clubId: item.clubId,
    summary: `Отклонено: ${item.title}`,
    payload: rejectReason ? { rejectReason } : undefined,
  });

  const full = await loadClubNews(item.id);
  if (full) await notifyClubAboutDecision(full, false, rejectReason);

  return {
    ok: true,
    message: `❌ Новость «${item.title}» отклонена. Клуб уведомлён.`,
  };
}

export async function approveClubNewsByTelegram(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const admin = await findSuperadminByTelegram(telegramId);
  if (!admin) {
    return { ok: false, message: "Модерировать новости может только администратор." };
  }
  return approveClubNews(token, admin.id);
}

export async function rejectClubNewsByTelegram(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const admin = await findSuperadminByTelegram(telegramId);
  if (!admin) {
    return { ok: false, message: "Модерировать новости может только администратор." };
  }
  return rejectClubNews(token, admin.id);
}

export async function approveClubNewsByAdmin(newsId: string, moderatorId: string) {
  const item = await prisma.clubNews.findUnique({ where: { id: newsId } });
  if (!item?.moderationToken) {
    throw new Error("Новость не найдена или уже обработана");
  }
  return approveClubNews(item.moderationToken, moderatorId);
}

export async function rejectClubNewsByAdmin(
  newsId: string,
  moderatorId: string,
  rejectReason?: string | null,
) {
  const item = await prisma.clubNews.findUnique({ where: { id: newsId } });
  if (!item?.moderationToken) {
    throw new Error("Новость не найдена или уже обработана");
  }
  return rejectClubNews(item.moderationToken, moderatorId, rejectReason);
}

export async function handleClubNewsModerationCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
): Promise<boolean> {
  const approveMatch = data.match(/^clubnews_approve_([a-f0-9-]+)$/i);
  const rejectMatch = data.match(/^clubnews_reject_([a-f0-9-]+)$/i);
  const token = approveMatch?.[1] ?? rejectMatch?.[1];
  if (!token) return false;

  const result = approveMatch
    ? await approveClubNewsByTelegram(token, telegramId)
    : await rejectClubNewsByTelegram(token, telegramId);

  await answerCallbackQuery(callbackQueryId, result.ok ? "Готово" : "Ошибка");
  await sendTelegramMessage(telegramId, result.message);
  return true;
}
