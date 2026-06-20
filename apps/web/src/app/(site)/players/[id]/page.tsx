import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { formatRating } from "@/lib/rating";
import { playerName } from "@/lib/public-display";
import { prisma } from "@/lib/prisma";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";
import { StatusBadge } from "@/components/admin/status-badge";
import { playerDetailMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id, isVerified: true },
    include: { city: true },
  });
  if (!player) return { title: "Игрок не найден" };
  return playerDetailMetadata(playerName(player), player.city?.nameRu ?? null, id);
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id, isVerified: true },
    include: {
      city: { include: { country: true } },
      registrations: {
        include: { tournament: { include: { club: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!player) notFound();

  return (
    <>
      <PageHeader title={playerName(player)}>
        <Link href="/players" className="site-btn-ghost text-emerald-400">
          ← Игроки
        </Link>
      </PageHeader>
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
              <dt className="text-zinc-500">Рейтинг</dt>
              <dd className="mt-1 font-mono text-lg text-emerald-400">
                {formatRating(player.rating)}
              </dd>
            </div>
            {player.telegramUsername && (
              <div>
                <dt className="text-zinc-500">Telegram</dt>
                <dd className="mt-1">@{player.telegramUsername}</dd>
              </div>
            )}
          </dl>
          {player.isCoach && (
            <div className="mt-4">
              <Link href={`/coaches/${player.id}`} className="site-btn-primary text-sm">
                Профиль тренера
              </Link>
            </div>
          )}
        </SiteCard>

        {player.about?.trim() && (
          <section>
            <h2 className="site-section-title mb-3">О себе</h2>
            <SiteCard>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                {player.about.trim()}
              </div>
            </SiteCard>
          </section>
        )}

        <section>
          <h2 className="site-section-title mb-3">Турниры</h2>
          {player.registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">Участий пока нет.</p>
          ) : (
            <ul className="space-y-2">
              {player.registrations.map((r) => (
                <li key={r.id} className="site-card px-4 py-3 text-sm">
                  <Link
                    href={`/tournaments/${r.tournament.id}`}
                    className="font-medium hover:text-emerald-400"
                  >
                    {r.tournament.name}
                  </Link>
                  <p className="mt-1 text-zinc-500">
                    {r.tournament.club.name} ·{" "}
                    {TOURNAMENT_STATUS_LABELS[r.tournament.status]}
                  </p>
                  <StatusBadge
                    status={r.status}
                    label={REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageMain>
    </>
  );
}
