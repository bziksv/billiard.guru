import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/brand";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  USER_ROLE_LABELS,
} from "@/lib/validators";
import { StatusBadge } from "@/components/admin/status-badge";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function CabinetPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?next=/cabinet");
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { playerId: player.id },
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

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <Link href="/" className="text-lg font-bold text-emerald-400">
              {APP_NAME}
            </Link>
            <p className="text-sm text-zinc-400">Личный кабинет</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 p-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-xl font-bold">
            {player.lastName} {player.firstName}
            {player.middleName ? ` ${player.middleName}` : ""}
          </h1>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Город</dt>
              <dd>
                {player.city.nameRu}, {player.city.country.nameRu}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Телефон</dt>
              <dd>{player.phone}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Рейтинг</dt>
              <dd>{player.rating}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Роль</dt>
              <dd>{USER_ROLE_LABELS[player.role] ?? player.role}</dd>
            </div>
            {player.telegramUsername && (
              <div>
                <dt className="text-zinc-500">Telegram</dt>
                <dd>@{player.telegramUsername}</dd>
              </div>
            )}
          </dl>
          {isSuperAdmin(player.role) && (
            <Link
              href="/admin"
              className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600"
            >
              Админ-панель
            </Link>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Мои регистрации на турниры</h2>
          {registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">Пока нет регистраций</p>
          ) : (
            <ul className="space-y-2">
              {registrations.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.tournament.name}</span>
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
                </li>
              ))}
            </ul>
          )}
        </section>

        {teams.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">Мои команды (парные турниры)</h2>
            <ul className="space-y-2">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm"
                >
                  <div className="font-medium">{team.tournament.name}</div>
                  <p className="mt-1 text-zinc-400">
                    Партнёр:{" "}
                    {team.player1Id === player.id
                      ? `${team.player2.lastName} ${team.player2.firstName}`
                      : `${team.player1.lastName} ${team.player1.firstName}`}
                    {" · "}
                    {team.tournament.club.name}
                  </p>
                  <StatusBadge
                    status={team.status}
                    label={REGISTRATION_STATUS_LABELS[team.status] ?? team.status}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
