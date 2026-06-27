import { randomUUID } from "crypto";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getNotificationLinkBase } from "@/lib/canonical-site-url";
import { syncLocalizedTitleBody } from "@/lib/translation";
import {
  answerCallbackQuery,
  ideaModerationKeyboard,
  ideaVoteKeyboard,
  sendTelegramMessage,
} from "@/lib/telegram";

function appUrl(path = "") {
  const base = getNotificationLinkBase();
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

async function loadIdea(ideaId: string) {
  return prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      author: { include: { city: true } },
      club: { select: { id: true, name: true } },
    },
  });
}

async function notifyAdminsAboutNewIdea(ideaId: string) {
  const idea = await loadIdea(ideaId);
  if (!idea) return;

  const adminIds = await getSuperadminTelegramIds();
  const link = appUrl("/admin/ideas");

  const authorLine = idea.club
    ? `От клуба «${idea.club.name}» (${idea.author.lastName} ${idea.author.firstName})`
    : `Автор: ${idea.author.lastName} ${idea.author.firstName}, ${idea.author.city.nameRu}`;

  for (const telegramId of adminIds) {
    await sendTelegramMessage(
      telegramId,
      `💡 <b>Новая идея на модерации</b>\n\n` +
        `<b>${idea.title}</b>\n\n` +
        `${truncate(idea.body, 400)}\n\n` +
        `${authorLine}\n\n` +
        `Модерация: ${link}`,
      { replyMarkup: ideaModerationKeyboard(idea.moderationToken!) },
    );
  }

  logger.info({ ideaId, admins: adminIds.length }, "Idea moderation requested");
}

export async function createIdea(
  authorId: string,
  title: string,
  body: string,
  clubId?: string,
) {
  const player = await prisma.player.findUnique({ where: { id: authorId } });
  if (!player?.isVerified) {
    throw new Error("Предлагать идеи могут только подтверждённые игроки");
  }

  const token = randomUUID();
  const idea = await prisma.idea.create({
    data: {
      authorId,
      clubId: clubId ?? null,
      title: title.trim(),
      body: body.trim(),
      status: "PENDING",
      moderationToken: token,
    },
    include: {
      author: { include: { city: true } },
    },
  });

  await writeAuditLog({
    actorType: "player",
    actorId: authorId,
    action: "idea.submit",
    entityType: "idea",
    entityId: idea.id,
  });

  try {
    await notifyAdminsAboutNewIdea(idea.id);
  } catch (error) {
    logger.error({ error, ideaId: idea.id }, "Idea admin notify failed");
  }

  return idea;
}

async function notifyAuthorApproved(idea: Awaited<ReturnType<typeof loadIdea>>) {
  if (!idea?.author.telegramId) return;
  await sendTelegramMessage(
    idea.author.telegramId,
    `✅ <b>Ваша идея прошла модерацию</b>\n\n` +
      `«<b>${idea.title}</b>» опубликована на billiard.guru.\n\n` +
      `Смотреть: ${appUrl("/ideas")}`,
  );
}

async function notifyAuthorRejected(
  idea: Awaited<ReturnType<typeof loadIdea>>,
  reason?: string | null,
) {
  if (!idea?.author.telegramId) return;
  const reasonBlock = reason?.trim()
    ? `\n\nПричина: ${truncate(reason.trim(), 300)}`
    : "";
  await sendTelegramMessage(
    idea.author.telegramId,
    `❌ <b>Идея не прошла модерацию</b>\n\n` +
      `«<b>${idea.title}</b>» отклонена.${reasonBlock}`,
  );
}

async function broadcastApprovedIdea(ideaId: string) {
  const idea = await loadIdea(ideaId);
  if (!idea || idea.status !== "APPROVED") return;

  const players = await prisma.player.findMany({
    where: {
      isVerified: true,
      telegramId: { not: null },
      id: { not: idea.authorId },
    },
    select: { id: true, telegramId: true },
  });

  const link = appUrl("/ideas");
  let sent = 0;

  for (const player of players) {
    if (!player.telegramId) continue;
    const ok = await sendTelegramMessage(
      player.telegramId,
      `💡 <b>Новая идея на billiard.guru</b>\n\n` +
        `<b>${idea.title}</b>\n\n` +
        `${truncate(idea.body, 500)}\n\n` +
        `Автор: ${idea.author.lastName} ${idea.author.firstName}\n\n` +
        `Оцените идею:`,
      { replyMarkup: ideaVoteKeyboard(idea.id) },
    );
    if (ok) sent++;
  }

  await writeAuditLog({
    actorType: "system",
    action: "idea.notify.broadcast",
    entityType: "idea",
    entityId: idea.id,
    payload: { recipients: players.length, sent },
  });

  logger.info({ ideaId, sent, recipients: players.length }, "Idea broadcast sent");
}

export async function approveIdea(
  token: string,
  moderatorId: string,
): Promise<{ ok: boolean; message: string }> {
  const idea = await prisma.idea.findFirst({
    where: { moderationToken: token },
    include: { author: true },
  });

  if (!idea) {
    return { ok: false, message: "Идея не найдена или уже обработана." };
  }
  if (idea.status !== "PENDING") {
    return { ok: false, message: "Идея уже модерирована." };
  }

  const localized = await syncLocalizedTitleBody({
    title: idea.title,
    body: idea.body,
  });

  await prisma.idea.update({
    where: { id: idea.id },
    data: {
      status: "APPROVED",
      moderationToken: null,
      moderatedAt: new Date(),
      moderatedById: moderatorId,
      rejectReason: null,
      titleEn: localized.titleEn,
      bodyEn: localized.bodyEn,
    },
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: moderatorId,
    action: "idea.approve",
    entityType: "idea",
    entityId: idea.id,
  });

  const fullIdea = await loadIdea(idea.id);
  await notifyAuthorApproved(fullIdea);
  await broadcastApprovedIdea(idea.id);

  return {
    ok: true,
    message: `✅ Идея «${idea.title}» опубликована. Автор и игроки уведомлены.`,
  };
}

export async function rejectIdea(
  token: string,
  moderatorId: string,
  rejectReason?: string | null,
): Promise<{ ok: boolean; message: string }> {
  const idea = await prisma.idea.findFirst({
    where: { moderationToken: token },
    include: { author: true },
  });

  if (!idea) {
    return { ok: false, message: "Идея не найдена или уже обработана." };
  }
  if (idea.status !== "PENDING") {
    return { ok: false, message: "Идея уже модерирована." };
  }

  await prisma.idea.update({
    where: { id: idea.id },
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
    action: "idea.reject",
    entityType: "idea",
    entityId: idea.id,
    payload: rejectReason ? { rejectReason } : undefined,
  });

  const fullIdea = await loadIdea(idea.id);
  await notifyAuthorRejected(fullIdea, rejectReason);

  return {
    ok: true,
    message: `❌ Идея «${idea.title}» отклонена. Автор уведомлён.`,
  };
}

export async function approveIdeaByTelegram(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const admin = await findSuperadminByTelegram(telegramId);
  if (!admin) {
    return { ok: false, message: "Модерировать идеи может только администратор." };
  }
  return approveIdea(token, admin.id);
}

export async function rejectIdeaByTelegram(
  token: string,
  telegramId: string,
): Promise<{ ok: boolean; message: string }> {
  const admin = await findSuperadminByTelegram(telegramId);
  if (!admin) {
    return { ok: false, message: "Модерировать идеи может только администратор." };
  }
  return rejectIdea(token, admin.id);
}

export async function approveIdeaByAdmin(ideaId: string, moderatorId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea?.moderationToken) {
    throw new Error("Идея не найдена или уже обработана");
  }
  return approveIdea(idea.moderationToken, moderatorId);
}

export async function rejectIdeaByAdmin(
  ideaId: string,
  moderatorId: string,
  rejectReason?: string | null,
) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea?.moderationToken) {
    throw new Error("Идея не найдена или уже обработана");
  }
  return rejectIdea(idea.moderationToken, moderatorId, rejectReason);
}

export async function castIdeaVote(
  ideaId: string,
  playerId: string,
  value: "LIKE" | "DISLIKE",
): Promise<{ likesCount: number; dislikesCount: number; myVote: "LIKE" | "DISLIKE" | null }> {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea || idea.status !== "APPROVED") {
    throw new Error("Идея не найдена или недоступна для голосования");
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player?.isVerified) {
    throw new Error("Голосовать могут только подтверждённые игроки");
  }

  const existing = await prisma.ideaVote.findUnique({
    where: { ideaId_playerId: { ideaId, playerId } },
  });

  if (existing?.value === value) {
    return {
      likesCount: idea.likesCount,
      dislikesCount: idea.dislikesCount,
      myVote: value,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    let likesDelta = 0;
    let dislikesDelta = 0;

    if (existing) {
      if (existing.value === "LIKE") likesDelta -= 1;
      else dislikesDelta -= 1;
      await tx.ideaVote.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      await tx.ideaVote.create({
        data: { ideaId, playerId, value },
      });
    }

    if (value === "LIKE") likesDelta += 1;
    else dislikesDelta += 1;

    const updated = await tx.idea.update({
      where: { id: ideaId },
      data: {
        likesCount: { increment: likesDelta },
        dislikesCount: { increment: dislikesDelta },
      },
    });

    return updated;
  });

  await writeAuditLog({
    actorType: "player",
    actorId: playerId,
    action: "idea.vote",
    entityType: "idea",
    entityId: ideaId,
    payload: { value },
  });

  return {
    likesCount: result.likesCount,
    dislikesCount: result.dislikesCount,
    myVote: value,
  };
}

export async function castIdeaVoteByTelegram(
  ideaId: string,
  telegramId: string,
  value: "LIKE" | "DISLIKE",
): Promise<{ ok: boolean; message: string }> {
  const player = await prisma.player.findFirst({
    where: { telegramId, isVerified: true },
  });
  if (!player) {
    return { ok: false, message: "Сначала подтвердите регистрацию в billiard.guru." };
  }

  try {
    const stats = await castIdeaVote(ideaId, player.id, value);
    const label = value === "LIKE" ? "👍 Нравится" : "👎 Не нравится";
    return {
      ok: true,
      message: `${label} · 👍 ${stats.likesCount} · 👎 ${stats.dislikesCount}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Не удалось проголосовать",
    };
  }
}

export async function handleIdeaModerationCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
): Promise<boolean> {
  const approveMatch = data.match(/^idea_approve_([a-f0-9-]+)$/i);
  const rejectMatch = data.match(/^idea_reject_([a-f0-9-]+)$/i);
  const token = approveMatch?.[1] ?? rejectMatch?.[1];
  if (!token) return false;

  const result = approveMatch
    ? await approveIdeaByTelegram(token, telegramId)
    : await rejectIdeaByTelegram(token, telegramId);

  await answerCallbackQuery(callbackQueryId, result.ok ? "Готово" : "Ошибка");
  await sendTelegramMessage(telegramId, result.message);
  return true;
}

export async function handleIdeaVoteCallback(
  data: string,
  telegramId: string,
  callbackQueryId: string,
): Promise<boolean> {
  const likeMatch = data.match(/^idea_like_([a-z0-9]+)$/i);
  const dislikeMatch = data.match(/^idea_dislike_([a-z0-9]+)$/i);
  const ideaId = likeMatch?.[1] ?? dislikeMatch?.[1];
  if (!ideaId) return false;

  const value = likeMatch ? "LIKE" : "DISLIKE";
  const result = await castIdeaVoteByTelegram(ideaId, telegramId, value);
  await answerCallbackQuery(callbackQueryId, result.ok ? "Учтено" : "Ошибка");
  if (result.message) {
    await sendTelegramMessage(telegramId, result.message);
  }
  return true;
}
