import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/admin/status-badge";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    include: { city: { include: { country: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Клубы</h1>
        <Link
          href="/admin/clubs/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          + Новый клуб
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Город</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((club) => (
              <tr key={club.id} className="border-t border-zinc-800">
                <td className="px-4 py-3 font-medium">{club.name}</td>
                <td className="px-4 py-3">
                  {club.city.nameRu}, {club.city.country.nameRu}
                </td>
                <td className="px-4 py-3">{club.phone}</td>
                <td className="px-4 py-3">
                  {club.telegramUsername ? `@${club.telegramUsername}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={club.isVerified ? "CONFIRMED" : "PENDING"}
                    label={club.isVerified ? "Подтверждён" : "Ожидает"}
                  />
                </td>
              </tr>
            ))}
            {clubs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Клубов пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
