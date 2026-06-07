import { randomUUID } from "crypto";
import { writeAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { buildConfirmLink } from "@/lib/telegram";

export type ClubConfirmState = {
  isVerified: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  confirmLink: string | null;
  ownerPlayer: {
    id: string;
    name: string;
    telegramId: string | null;
    isVerified: boolean;
  } | null;
  canSendTelegram: boolean;
};

async function loadClub(clubId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Клуб не найден");
  return club;
}

async function loadOwnerPlayer(phone: string) {
  return prisma.player.findFirst({
    where: { phone },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      telegramId: true,
      isVerified: true,
    },
  });
}

function toConfirmState(
  club: Awaited<ReturnType<typeof loadClub>>,
  owner: Awaited<ReturnType<typeof loadOwnerPlayer>>,
): ClubConfirmState {
  const confirmLink =
    !club.isVerified && club.confirmToken ? buildConfirmLink(club.confirmToken) : null;
  const ownerTelegramId = owner?.telegramId ?? null;

  return {
    isVerified: club.isVerified,
    telegramId: club.telegramId,
    telegramUsername: club.telegramUsername,
    confirmLink,
    ownerPlayer: owner
      ? {
          id: owner.id,
          name: `${owner.lastName} ${owner.firstName}`,
          telegramId: owner.telegramId,
          isVerified: owner.isVerified,
        }
      : null,
    canSendTelegram: !club.isVerified && !!ownerTelegramId,
  };
}

/** Для неподтверждённого клуба гарантирует наличие confirmToken. */
export async function ensureClubConfirmToken(clubId: string) {
  const club = await loadClub(clubId);
  if (club.isVerified) return club;

  if (club.confirmToken) return club;

  return prisma.club.update({
    where: { id: clubId },
    data: { confirmToken: randomUUID() },
  });
}

export async function getClubConfirmState(clubId: string): Promise<ClubConfirmState> {
  const club = await ensureClubConfirmToken(clubId);
  const owner = await loadOwnerPlayer(club.phone);
  return toConfirmState(club, owner);
}

export type ClubConfirmActor = {
  actorType: "admin" | "club" | "player" | "system";
  actorId: string;
};

export async function regenerateClubConfirmLink(clubId: string, actor: ClubConfirmActor) {
  const club = await loadClub(clubId);
  if (club.isVerified) {
    throw new Error("Клуб уже подтверждён");
  }

  const token = randomUUID();
  const updated = await prisma.club.update({
    where: { id: clubId },
    data: { confirmToken: token },
  });

  await writeAuditLog({
    actorType: actor.actorType === "player" ? "club" : actor.actorType,
    actorId: actor.actorId,
    action: "club.confirm.link_regenerate",
    entityType: "club",
    entityId: clubId,
    summary: "Новая ссылка подтверждения клуба",
  });

  const owner = await loadOwnerPlayer(updated.phone);
  return toConfirmState(updated, owner);
}

export type ClubConfirmTelegramSendResult = {
  sent: boolean;
  reason?: string;
};

type ConfirmTelegramAudit = {
  actorType: "admin" | "club" | "player" | "system";
  actorId: string;
  action: "club.confirm.telegram_sent" | "club.confirm.telegram_auto";
};

function auditActorType(actorType: ConfirmTelegramAudit["actorType"]) {
  return actorType === "player" ? "club" : actorType;
}

async function deliverClubConfirmTelegram(
  club: NonNullable<Awaited<ReturnType<typeof loadClub>>>,
  owner: NonNullable<Awaited<ReturnType<typeof loadOwnerPlayer>>>,
  audit: ConfirmTelegramAudit,
): Promise<ClubConfirmTelegramSendResult> {
  if (club.isVerified) {
    return { sent: false, reason: "Клуб уже подтверждён" };
  }
  if (!club.confirmToken) {
    return { sent: false, reason: "Нет токена подтверждения" };
  }
  if (!owner.telegramId) {
    return {
      sent: false,
      reason: "У владельца нет привязанного Telegram",
    };
  }

  const confirmLink = buildConfirmLink(club.confirmToken);
  const text =
    `🏢 <b>Подтвердите клуб на billiard.guru</b>\n\n` +
    `«<b>${club.name}</b>»\n\n` +
    `Нажмите кнопку ниже, чтобы подтвердить право владения.`;

  const sent = await dispatchNotification(
    "club-confirm-resend",
    owner.telegramId,
    text,
    {
      replyMarkup: {
        inline_keyboard: [[{ text: "✅ Подтвердить клуб", url: confirmLink }]],
      },
    },
    {
      playerId: owner.id,
      entityType: "club",
      entityId: club.id,
      templateVars: { clubName: club.name, confirmLink },
    },
  );

  if (!sent) {
    return { sent: false, reason: "Telegram не доставил сообщение" };
  }

  await writeAuditLog({
    actorType: auditActorType(audit.actorType),
    actorId: audit.actorId,
    action: audit.action,
    entityType: "club",
    entityId: club.id,
    summary:
      audit.action === "club.confirm.telegram_auto"
        ? "Ссылка подтверждения клуба отправлена в Telegram при регистрации"
        : "Ссылка подтверждения клуба отправлена в Telegram",
    payload: { ownerPlayerId: owner.id },
  });

  return { sent: true };
}

/** Автоотправка после создания клуба — не бросает ошибку, если Telegram недоступен. */
export async function tryAutoSendClubConfirmTelegram(
  clubId: string,
  audit: ConfirmTelegramAudit,
): Promise<ClubConfirmTelegramSendResult> {
  const club = await loadClub(clubId);
  const owner = await loadOwnerPlayer(club.phone);
  if (!owner) {
    return { sent: false, reason: "Игрок с телефоном владельца не найден" };
  }
  return deliverClubConfirmTelegram(club, owner, audit);
}

export async function sendClubConfirmTelegram(clubId: string, actor: ClubConfirmActor) {
  const club = await ensureClubConfirmToken(clubId);
  if (club.isVerified) {
    throw new Error("Клуб уже подтверждён");
  }

  const owner = await loadOwnerPlayer(club.phone);
  if (!owner?.telegramId) {
    throw new Error(
      "У владельца нет привязанного Telegram. Отправьте ссылку вручную или попросите войти на сайт.",
    );
  }

  const result = await deliverClubConfirmTelegram(club, owner, {
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "club.confirm.telegram_sent",
  });

  if (!result.sent) {
    throw new Error(result.reason ?? "Не удалось отправить сообщение в Telegram");
  }

  return toConfirmState(club, owner);
}
