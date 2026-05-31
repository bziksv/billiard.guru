import { StatusBadge } from "@/components/admin/status-badge";
import { SiteCard } from "@/components/site/site-card";

type ClubListItem = {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  tableCount?: number | null;
  isVerified: boolean;
  city: { nameRu: string; country: { nameRu: string } };
  _count?: { tournaments: number };
};

export function ClubCard({
  club,
  href,
}: {
  club: ClubListItem;
  href?: string;
}) {
  const body = (
    <div className="flex gap-4">
      {club.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={club.photoUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-2xl">
          🎱
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{club.name}</h3>
          <StatusBadge
            status={club.isVerified ? "CONFIRMED" : "PENDING"}
            label={club.isVerified ? "Подтверждён" : "Ожидает Telegram"}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          {club.city.nameRu}, {club.city.country.nameRu}
        </p>
        {club.tableCount != null && club.tableCount > 0 && (
          <p className="mt-1 text-xs text-zinc-500">{club.tableCount} столов</p>
        )}
        {club.email && <p className="mt-1 text-sm text-zinc-500">{club.email}</p>}
        {club._count && (
          <p className="mt-2 text-xs text-zinc-600">Турниров: {club._count.tournaments}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <SiteCard href={href}>{body}</SiteCard>;
  }

  return <SiteCard>{body}</SiteCard>;
}
