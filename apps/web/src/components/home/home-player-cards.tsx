import Link from "next/link";
import { formatRating } from "@/lib/rating";
import { playerName } from "@/lib/public-display";

type PlayerItem = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  rating: number;
  photoUrl: string | null;
  city: { nameRu: string };
};

const RANK_STYLES = [
  "ring-2 ring-amber-400/80 shadow-amber-900/30",
  "ring-2 ring-zinc-300/60 shadow-zinc-500/20",
  "ring-2 ring-amber-700/60 shadow-amber-950/30",
] as const;

export function HomePlayerCards({ players }: { players: PlayerItem[] }) {
  if (players.length === 0) {
    return (
      <p className="home-content-card rounded-2xl px-6 py-12 text-center home-card-muted">
        Пока нет подтверждённых игроков в этом регионе.
      </p>
    );
  }

  return (
    <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 snap-x snap-mandatory">
      {players.map((player, index) => (
        <Link
          key={player.id}
          href={`/players/${player.id}`}
          className={`home-content-card-solid home-card-glow group w-[210px] shrink-0 snap-start overflow-hidden rounded-2xl ${
            index < 3 ? RANK_STYLES[index] : ""
          }`}
        >
          <div className="home-player-header relative h-32">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-500/20" />
            <div
              className={`absolute bottom-3 left-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border bg-[var(--surface-inset)] text-xl font-bold text-emerald-600 ${
                index === 0
                  ? "border-amber-500/50"
                  : index === 1
                    ? "border-zinc-400/40"
                    : index === 2
                      ? "border-amber-800/50"
                      : "border-[var(--border-subtle)]"
              }`}
            >
              {player.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                player.firstName[0]
              )}
            </div>
            <span
              className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                index === 0
                  ? "bg-amber-500/20 text-amber-600"
                  : index === 1
                    ? "bg-zinc-400/15 text-zinc-600"
                    : index === 2
                      ? "bg-amber-800/25 text-amber-700"
                      : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
              }`}
            >
              {index + 1}
            </span>
          </div>
          <div className="p-4">
            <p className="home-card-title truncate font-semibold group-hover:text-emerald-600">
              {playerName(player)}
            </p>
            <p className="home-card-muted mt-1 truncate text-xs">{player.city.nameRu}</p>
            <p className="mt-3 font-mono text-lg text-emerald-600">
              {formatRating(player.rating)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
