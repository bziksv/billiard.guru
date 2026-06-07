import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { describeHandicapShort } from "@/lib/handicap";
import { formatRating } from "@/lib/rating";
import { teamLabel } from "@/lib/pair-tournament";
import { formatStartsAt } from "@/lib/public-display";
import { buildBracketMatchNumbers } from "@/lib/tournament-match-schedule";
import { dispatchNotification } from "@/lib/notifications";
import { getNotificationDefaultTemplate } from "@/lib/notifications/default-templates";
import {
  getNotificationItemSettings,
  renderNotificationTemplate,
} from "@/lib/notifications/settings-server";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3010";
  return `${base.replace(/\/$/, "")}${path}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type NotifyPlayer = {
  id: string;
  telegramId: string | null;
  firstName: string;
  lastName: string;
};

type NotifyTeam = {
  player1: NotifyPlayer & { rating: number };
  player2?: (NotifyPlayer & { rating: number }) | null;
};

function collectPlayers(team: NotifyTeam | null): NotifyPlayer[] {
  if (!team) return [];
  const out: NotifyPlayer[] = [];
  if (team.player1.telegramId) out.push(team.player1);
  if (team.player2?.telegramId) out.push(team.player2);
  return out;
}

function playerOnTeam(team: NotifyTeam | null, playerId: string): boolean {
  if (!team) return false;
  return team.player1.id === playerId || team.player2?.id === playerId;
}

function notifyTeamRating(team: NotifyTeam): number {
  if (!team.player2) return team.player1.rating;
  return team.player1.rating + team.player2.rating;
}

function linesForPlayer(
  playerId: string,
  team1: NotifyTeam | null,
  team2: NotifyTeam | null,
  handicapHalfStep: boolean,
): { ratingsLine: string; handicapLine: string } {
  const onTeam1 = playerOnTeam(team1, playerId);
  const onTeam2 = playerOnTeam(team2, playerId);
  const myTeam = onTeam1 ? team1 : onTeam2 ? team2 : null;
  const oppTeam = onTeam1 ? team2 : onTeam2 ? team1 : null;
  if (!myTeam || !oppTeam) return { ratingsLine: "", handicapLine: "" };

  const ratingsLine =
    `Рейтинг: ${formatRating(notifyTeamRating(myTeam))} — ${formatRating(notifyTeamRating(oppTeam))}\n`;

  const high = Math.max(notifyTeamRating(myTeam), notifyTeamRating(oppTeam));
  const low = Math.min(notifyTeamRating(myTeam), notifyTeamRating(oppTeam));
  const short = describeHandicapShort(high, low, { halfStep: handicapHalfStep });
  const handicapLine =
    short === "Без форы" ? "" : `Фора: ${short}\n`;

  return { ratingsLine, handicapLine };
}

/** Telegram-уведомление участникам: встреча назначена / время начала сохранено. */
export async function notifyMatchStartScheduled(
  matchId: string,
  startedAt: Date,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      tournament: { include: { club: true } },
      team1: {
        include: {
          player1: { select: { id: true, telegramId: true, firstName: true, lastName: true, rating: true } },
          player2: { select: { id: true, telegramId: true, firstName: true, lastName: true, rating: true } },
        },
      },
      team2: {
        include: {
          player1: { select: { id: true, telegramId: true, firstName: true, lastName: true, rating: true } },
          player2: { select: { id: true, telegramId: true, firstName: true, lastName: true, rating: true } },
        },
      },
    },
  });

  if (!match?.team1 && !match?.team2) return;

  const allMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: match.tournamentId },
    select: { id: true, round: true, slot: true },
    orderBy: [{ round: "asc" }, { slot: "asc" }],
  });

  const bracketViews = allMatches.map((m) => ({
    id: m.id,
    round: m.round,
    slot: m.slot,
    status: "SCHEDULED" as const,
    winnerTeamId: null,
    team1Score: null,
    team2Score: null,
    startedAt: null,
    finishedAt: null,
    team1: null,
    team2: null,
  }));

  const matchNumbers = buildBracketMatchNumbers(
    bracketViews,
    match.tournament.format,
  );
  const matchNo = matchNumbers.get(matchId);
  const when = escapeHtml(formatStartsAt(startedAt));
  const tournamentName = escapeHtml(match.tournament.name);
  const clubName = escapeHtml(match.tournament.club.name);
  const link = appUrl(`/tournaments/${match.tournamentId}`);
  const useInlineLink = link.startsWith("https://");

  const team1Label = match.team1 ? teamLabel(match.team1) : "—";
  const team2Label = match.team2 ? teamLabel(match.team2) : "—";
  const handicapHalfStep = match.tournament.handicapHalfStep !== false;

  const recipients = new Map<
    string,
    { player: NotifyPlayer; opponent: string; ratingsLine: string; handicapLine: string }
  >();

  for (const player of collectPlayers(match.team1)) {
    const { ratingsLine, handicapLine } = linesForPlayer(
      player.id,
      match.team1,
      match.team2,
      handicapHalfStep,
    );
    recipients.set(player.id, {
      player,
      opponent: team2Label,
      ratingsLine,
      handicapLine,
    });
  }
  for (const player of collectPlayers(match.team2)) {
    const { ratingsLine, handicapLine } = linesForPlayer(
      player.id,
      match.team1,
      match.team2,
      handicapHalfStep,
    );
    recipients.set(player.id, {
      player,
      opponent: team1Label,
      ratingsLine,
      handicapLine,
    });
  }

  const { templateOverride } = await getNotificationItemSettings("match-start-scheduled");
  const matchFallback = getNotificationDefaultTemplate("match-start-scheduled") ?? "";

  let sent = 0;
  for (const { player, opponent, ratingsLine, handicapLine } of recipients.values()) {
    if (!player.telegramId) continue;
    const opponentHtml = escapeHtml(opponent);
    const matchLine =
      matchNo !== undefined ? `Встреча <b>#${matchNo}</b>\n` : "";

    const body = renderNotificationTemplate(
      templateOverride,
      {
        tournamentName,
        matchNo: matchLine,
        opponent: opponentHtml,
        ratings: escapeHtml(ratingsLine),
        handicap: escapeHtml(handicapLine),
        startsAt: when,
        clubName,
        link: useInlineLink ? "" : `\n\n${link}`,
      },
      matchFallback,
    );

    const ok = await dispatchNotification(
      "match-start-scheduled",
      player.telegramId,
      body,
      useInlineLink
        ? {
            replyMarkup: {
              inline_keyboard: [[{ text: "Открыть турнир", url: link }]],
            },
          }
        : undefined,
      { playerId: player.id },
    );
    if (ok) sent++;
  }

  if (recipients.size > 0) {
    logger.info(
      { matchId, recipients: recipients.size, sent, startedAt: startedAt.toISOString() },
      "Match start Telegram notifications sent",
    );
    await writeAuditLog({
      actorType: "system",
      action: "tournament.match.start.notify",
      entityType: "tournament_match",
      entityId: matchId,
      payload: { recipients: recipients.size, sent, startedAt: startedAt.toISOString() },
    });
  }
}
