import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications";
import type { NotificationId } from "@/lib/notifications/catalog";
import { getNotificationDefaultTemplate } from "@/lib/notifications/default-templates";
import {
  getNotificationItemSettings,
  renderNotificationTemplate,
} from "@/lib/notifications/settings-server";
import { formatStartsAt } from "@/lib/public-display";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return `${base.replace(/\/$/, "")}${path}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type TournamentForNotify = {
  id: string;
  name: string;
  format: string;
  startsAt: Date | null;
  club: { name: string; city?: { nameRu: string } | null };
};

function buildTemplateVars(tournament: TournamentForNotify) {
  const link = appUrl(`/tournaments/${tournament.id}`);
  const useInlineLink = link.startsWith("https://");
  const city = tournament.club.city?.nameRu;
  return {
    tournamentName: escapeHtml(tournament.name),
    clubName: escapeHtml(tournament.club.name),
    cityName: city ? `, ${escapeHtml(city)}` : "",
    format: escapeHtml(TOURNAMENT_FORMAT_LABELS[tournament.format] ?? tournament.format),
    startsAt: escapeHtml(formatStartsAt(tournament.startsAt)),
    link: useInlineLink ? "" : `\n\n${link}`,
    linkUrl: link,
    useInlineLink,
  };
}

function templateVarsForRender(tournament: TournamentForNotify): Record<string, string> {
  const { linkUrl: _u, useInlineLink: _i, ...vars } = buildTemplateVars(tournament);
  return vars;
}

async function sendToPlayer(
  notificationId: NotificationId,
  auditAction: string,
  playerId: string,
  telegramId: string,
  entityId: string,
  tournament: TournamentForNotify,
  entityType: "tournament_registration" | "tournament_team" = "tournament_registration",
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const built = buildTemplateVars(tournament);
  const { templateOverride } = await getNotificationItemSettings(notificationId);
  const fallback = getNotificationDefaultTemplate(notificationId) ?? "";
  const body = renderNotificationTemplate(
    templateOverride,
    templateVarsForRender(tournament),
    fallback,
  );

  const ok = await dispatchNotification(
    notificationId,
    telegramId,
    body,
    built.useInlineLink
      ? {
          replyMarkup: {
            inline_keyboard: [[{ text: "Открыть турнир", url: built.linkUrl }]],
          },
        }
      : undefined,
    { playerId },
  );

  if (ok) {
    await writeAuditLog({
      actorType: "system",
      action: auditAction,
      entityType,
      entityId,
      payload: { notificationId, tournamentId: tournament.id },
    });
  }
  return ok;
}

async function loadRegistrationContext(registrationId: string) {
  return prisma.tournamentRegistration.findUnique({
    where: { id: registrationId },
    include: {
      player: { select: { id: true, telegramId: true } },
      tournament: { include: { club: { include: { city: true } } } },
    },
  });
}

/** Клуб добавил участника на турнир (заявка в ожидании). */
export async function notifyTournamentRegisteredByClub(registrationId: string): Promise<void> {
  try {
    const reg = await loadRegistrationContext(registrationId);
    if (!reg?.player.telegramId || reg.source !== "CLUB") return;

    const sent = await sendToPlayer(
      "tournament-registration-by-club",
      "tournament.registration.notify.by_club",
      reg.player.id,
      reg.player.telegramId,
      reg.id,
      reg.tournament,
    );
    if (sent) {
      logger.info({ registrationId }, "Tournament by-club registration Telegram sent");
    }
  } catch (error) {
    logger.error({ error, registrationId }, "Tournament by-club registration notify failed");
  }
}

/** Участник сам подал заявку на турнир. */
export async function notifyTournamentSelfRegistered(registrationId: string): Promise<void> {
  try {
    const reg = await loadRegistrationContext(registrationId);
    if (!reg?.player.telegramId || reg.source !== "SELF") return;

    const sent = await sendToPlayer(
      "tournament-registration-self",
      "tournament.registration.notify.self",
      reg.player.id,
      reg.player.telegramId,
      reg.id,
      reg.tournament,
    );
    if (sent) {
      logger.info({ registrationId }, "Tournament self-registration Telegram sent");
    }
  } catch (error) {
    logger.error({ error, registrationId }, "Tournament self-registration notify failed");
  }
}

/** Организатор подтвердил заявку на участие. */
export async function notifyTournamentRegistrationConfirmed(registrationId: string): Promise<void> {
  try {
    const reg = await loadRegistrationContext(registrationId);
    if (!reg?.player.telegramId) return;

    const sent = await sendToPlayer(
      "tournament-registration-confirmed",
      "tournament.registration.notify.confirmed",
      reg.player.id,
      reg.player.telegramId,
      reg.id,
      reg.tournament,
    );
    if (sent) {
      logger.info({ registrationId }, "Tournament registration confirmed Telegram sent");
    }
  } catch (error) {
    logger.error({ error, registrationId }, "Tournament registration confirmed notify failed");
  }
}

/** Организатор отклонил заявку на участие. */
export async function notifyTournamentRegistrationRejected(registrationId: string): Promise<void> {
  try {
    const reg = await loadRegistrationContext(registrationId);
    if (!reg?.player.telegramId) return;

    const sent = await sendToPlayer(
      "tournament-registration-rejected",
      "tournament.registration.notify.rejected",
      reg.player.id,
      reg.player.telegramId,
      reg.id,
      reg.tournament,
    );
    if (sent) {
      logger.info({ registrationId }, "Tournament registration rejected Telegram sent");
    }
  } catch (error) {
    logger.error({ error, registrationId }, "Tournament registration rejected notify failed");
  }
}

async function loadTeamContext(teamId: string) {
  return prisma.tournamentTeam.findUnique({
    where: { id: teamId },
    include: {
      player1: { select: { id: true, telegramId: true } },
      player2: { select: { id: true, telegramId: true } },
      tournament: { include: { club: { include: { city: true } } } },
    },
  });
}

/** Парный турнир: клуб зарегистрировал команду — обоим игрокам. */
export async function notifyTournamentTeamRegisteredByClub(teamId: string): Promise<void> {
  try {
    const team = await loadTeamContext(teamId);
    if (!team || team.source !== "CLUB") return;

    let sent = 0;
    for (const p of [team.player1, team.player2]) {
      if (!p.telegramId) continue;
      if (
        await sendToPlayer(
          "tournament-registration-by-club",
          "tournament.registration.notify.by_club",
          p.id,
          p.telegramId,
          team.id,
          team.tournament,
          "tournament_team",
        )
      ) {
        sent++;
      }
    }
    if (sent > 0) {
      logger.info({ teamId, sent }, "Tournament team by-club registration Telegram sent");
    }
  } catch (error) {
    logger.error({ error, teamId }, "Tournament team by-club registration notify failed");
  }
}

/** Парный турнир: заявка команды подтверждена — обоим игрокам. */
export async function notifyTournamentTeamRegistrationConfirmed(teamId: string): Promise<void> {
  try {
    const team = await loadTeamContext(teamId);
    if (!team) return;

    const ids = new Set<string>();
    for (const p of [team.player1, team.player2]) {
      if (p.telegramId) ids.add(p.telegramId);
    }
    let sent = 0;
    for (const telegramId of ids) {
      if (
        await sendToPlayer(
          "tournament-registration-confirmed",
          "tournament.registration.notify.confirmed",
          telegramId,
          team.id,
          team.tournament,
          "tournament_team",
        )
      ) {
        sent++;
      }
    }
    if (sent > 0) {
      logger.info({ teamId, sent }, "Tournament team confirmed Telegram sent");
    }
  } catch (error) {
    logger.error({ error, teamId }, "Tournament team confirmed notify failed");
  }
}

/** Парный турнир: заявка команды отклонена — обоим игрокам. */
export async function notifyTournamentTeamRegistrationRejected(teamId: string): Promise<void> {
  try {
    const team = await loadTeamContext(teamId);
    if (!team) return;

    let sent = 0;
    for (const p of [team.player1, team.player2]) {
      if (!p.telegramId) continue;
      if (
        await sendToPlayer(
          "tournament-registration-rejected",
          "tournament.registration.notify.rejected",
          p.id,
          p.telegramId,
          team.id,
          team.tournament,
          "tournament_team",
        )
      ) {
        sent++;
      }
    }
    if (sent > 0) {
      logger.info({ teamId, sent }, "Tournament team rejected Telegram sent");
    }
  } catch (error) {
    logger.error({ error, teamId }, "Tournament team rejected notify failed");
  }
}
