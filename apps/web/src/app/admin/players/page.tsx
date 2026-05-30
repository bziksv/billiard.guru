import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRating } from "@/lib/rating";
import { StatusBadge } from "@/components/admin/status-badge";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    include: { city: { include: { country: true } } },
    orderBy: [{ rating: "desc" }, { lastName: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Игроки</h1>
        <Link
          href="/admin/players/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          + Новый игрок
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3">ФИО</th>
              <th className="px-4 py-3">Город</th>
              <th className="px-4 py-3">Д.р.</th>
              <th className="px-4 py-3">Рейтинг</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {player.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.photoUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs">
                        {player.firstName[0]}
                      </div>
                    )}
                    <span className="font-medium">
                      {player.lastName} {player.firstName}
                      {player.middleName ? ` ${player.middleName}` : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {player.city.nameRu}, {player.city.country.nameRu}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {player.birthDate
                    ? new Date(player.birthDate).toLocaleDateString("ru-RU")
                    : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-emerald-400">
                  {formatRating(player.rating)}
                </td>
                <td className="px-4 py-3">{player.phone}</td>
                <td className="px-4 py-3">
                  {player.telegramUsername ? `@${player.telegramUsername}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={player.isVerified ? "CONFIRMED" : "PENDING"}
                    label={player.isVerified ? "Подтверждён" : "Ожидает"}
                  />
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Игроков пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
