import Link from "next/link";
import { BRACKET_FORMAT_CATALOG } from "@/lib/bracket-formats/catalog";
import { NOTIFICATION_CATALOG } from "@/lib/notifications/catalog";
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
    { label: "Типы сеток", value: BRACKET_FORMAT_CATALOG.length, href: "/admin/brackets" },
    {
      label: "Уведомления (типов)",
      value: NOTIFICATION_CATALOG.length,
      href: "/admin/notifications",
    },
    { label: "Ожидают подтверждения", value: pending, href: "/admin/tournaments" },
    { label: "Идеи на модерации", value: pendingIdeas, href: "/admin/ideas" },
  ];

  return (
    <div>
      <h1 className="admin-page-title mb-2">Обзор</h1>
      <p className="admin-page-lead mb-8">
        Управление клубами, игроками и турнирами по бильярду
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="admin-stat-card">
            <p className="admin-stat-label">{card.label}</p>
            <p className="admin-stat-value">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
