import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { RegistrationCancelButton } from "@/components/site/registration-cancel-button";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { getCurrentPlayer, isSuperAdmin } from "@/lib/auth";
import { formatRating } from "@/lib/rating";
import { prisma } from "@/lib/prisma";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  USER_ROLE_LABELS,
} from "@/lib/validators";
import { t } from "@/lib/site";

export default async function CabinetPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?next=/cabinet");
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: {
      playerId: player.id,
      status: { notIn: ["CANCELLED", "REJECTED"] },
    },
    include: {
      tournament: { include: { club: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const teams = await prisma.tournamentTeam.findMany({
    where: {
      OR: [{ player1Id: player.id }, { player2Id: player.id }],
    },
    include: {
      tournament: { include: { club: true } },
      player1: true,
      player2: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pairTeams = teams.filter((team) => team.player2);

  return (
    <>
      <PageHeader
        title={t("nav.cabinet")}
        lead={`${player.lastName} ${player.firstName}${player.middleName ? ` ${player.middleName}` : ""}`}
      />
      <PageMain className="space-y-8 pt-0">
        <SiteCard>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Город</dt>
              <dd className="mt-1">
                {player.city.nameRu}, {player.city.country.nameRu}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Телефон</dt>
              <dd className="mt-1">{player.phone}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Рейтинг</dt>
              <dd className="mt-1 font-mono text-emerald-400">
                {formatRating(player.rating)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Роль</dt>
              <dd className="mt-1">{USER_ROLE_LABELS[player.role] ?? player.role}</dd>
            </div>
            {player.telegramUsername && (
              <div>
                <dt className="text-zinc-500">Telegram</dt>
                <dd className="mt-1">@{player.telegramUsername}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/players/${player.id}`} className="site-btn-secondary">
              Публичный профиль
            </Link>
            {isSuperAdmin(player.role) && (
              <Link href="/admin" className="site-btn-primary">
                {t("nav.admin")}
              </Link>
            )}
          </div>
        </SiteCard>

        <section>
          <h2 className="site-section-title mb-3">Мои регистрации</h2>
          {registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Пока нет регистраций.{" "}
              <Link href="/tournaments" className="text-emerald-400 hover:underline">
                Смотреть турниры
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {registrations.map((r) => (
                <li key={r.id} className="site-card px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tournaments/${r.tournament.id}`}
                      className="font-medium hover:text-emerald-400"
                    >
                      {r.tournament.name}
                    </Link>
                    <StatusBadge
                      status={r.status}
                      label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
                    />
                  </div>
                  <p className="mt-1 text-zinc-400">
                    {TOURNAMENT_FORMAT_LABELS[r.tournament.format]} ·{" "}
                    {r.tournament.club.name} ·{" "}
                    {TOURNAMENT_STATUS_LABELS[r.tournament.status]}
                  </p>
                  <RegistrationCancelButton
                    registrationId={r.id}
                    tournamentStatus={r.tournament.status}
                    registrationStatus={r.status}
                    className="mt-2"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {pairTeams.length > 0 && (
          <section>
            <h2 className="site-section-title mb-3">Мои команды</h2>
            <ul className="space-y-2">
              {pairTeams.map((team) => {
                const partner =
                  team.player1Id === player.id ? team.player2 : team.player1;
                return (
                <li key={team.id} className="site-card px-4 py-3 text-sm">
                  <Link
                    href={`/tournaments/${team.tournament.id}`}
                    className="font-medium hover:text-emerald-400"
                  >
                    {team.tournament.name}
                  </Link>
                  <p className="mt-1 text-zinc-400">
                    Партнёр:{" "}
                    {partner
                      ? `${partner.lastName} ${partner.firstName}`
                      : "—"}
                    {" · "}
                    {team.tournament.club.name}
                  </p>
                  <StatusBadge
                    status={team.status}
                    label={REGISTRATION_STATUS_LABELS[team.status] ?? team.status}
                  />
                </li>
                );
              })}
            </ul>
          </section>
        )}
      </PageMain>
    </>
  );
}
