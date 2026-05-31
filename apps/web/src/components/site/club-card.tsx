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
        <div className="site-entity-thumb h-16 w-16 shrink-0 text-2xl">
          🎱
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="home-card-title font-semibold">{club.name}</h3>
          <StatusBadge
            status={club.isVerified ? "CONFIRMED" : "PENDING"}
            label={club.isVerified ? "Подтверждён" : "Ожидает Telegram"}
          />
        </div>
        <p className="home-card-body mt-2 text-sm">
          {club.city.nameRu}, {club.city.country.nameRu}
        </p>
        {club.tableCount != null && club.tableCount > 0 && (
          <p className="home-card-muted mt-1 text-xs">{club.tableCount} столов</p>
        )}
        {club.email && <p className="home-card-muted mt-1 text-sm">{club.email}</p>}
        {club._count && (
          <p className="home-card-muted mt-2 text-xs">Турниров: {club._count.tournaments}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <SiteCard href={href}>{body}</SiteCard>;
  }

  return <SiteCard>{body}</SiteCard>;
}
