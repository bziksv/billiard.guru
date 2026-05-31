import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [clubs, players, tournaments, pending, pendingIdeas] = await Promise.all([
    prisma.club.count(),
    prisma.player.count(),
    prisma.tournament.count(),
    prisma.tournamentRegistration.count({ where: { status: "PENDING" } }),
    prisma.idea.count({ where: { status: "PENDING" } }),
  ]);

  const cards = [
    { label: "Клубы", value: clubs, href: "/admin/clubs" },
    { label: "Игроки", value: players, href: "/admin/players" },
    { label: "Турниры", value: tournaments, href: "/admin/tournaments" },
    { label: "Ожидают подтверждения", value: pending, href: "/admin/tournaments" },
    { label: "Идеи на модерации", value: pendingIdeas, href: "/admin/ideas" },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Обзор</h1>
      <p className="mb-8 text-zinc-400">
        Управление клубами, игроками и турнирами по бильярду
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-emerald-700"
          >
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
