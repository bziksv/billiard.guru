"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteCard } from "@/components/site/site-card";
import { AsyncButton } from "@/components/ui/async-text-button";
import { formatRating } from "@/lib/rating";
import {
  formatGameFormat,
  formatPlayListingSchedule,
  formatRatingRange,
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_RESPONSE_STATUS_LABELS,
  PLAY_LISTING_SCHEDULE_LABELS,
  PLAY_LISTING_STATUS_LABELS,
} from "@/lib/play-listing-display";
import type { SerializedPlayListing } from "@/lib/play-listing-server";

type ResponseView = {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    photoUrl: string | null;
    telegramUsername: string | null;
  };
};

export function PlayListingDetailClient({
  listing: initialListing,
  responses: initialResponses,
  isLoggedIn,
  isVerified,
  isAuthor,
}: {
  listing: SerializedPlayListing;
  responses: ResponseView[];
  isLoggedIn: boolean;
  isVerified: boolean;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [listing, setListing] = useState(initialListing);
  const [responses, setResponses] = useState(initialResponses);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  const ratingRange = formatRatingRange(listing.ratingMin, listing.ratingMax);
  const gameFormat = formatGameFormat(listing.gameFormat);
  const schedule = formatPlayListingSchedule(listing);
  const isOpen = listing.status === "OPEN";

  async function respond() {
    setError(null);
    setResponding(true);
    const res = await fetch(`/api/play-listings/${listing.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setResponding(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось откликнуться");
      return;
    }
    setListing((l) => ({ ...l, myResponseStatus: "PENDING" }));
    setMessage("");
    router.refresh();
  }

  async function updateStatus(status: "OPEN" | "MATCHED" | "CLOSED") {
    const res = await fetch(`/api/play-listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Ошибка");
      return;
    }
    const data = await res.json();
    setListing((l) => ({ ...l, status: data.status }));
    router.refresh();
  }

  async function updateResponse(responseId: string, status: "ACCEPTED" | "DECLINED" | "WITHDRAWN") {
    const res = await fetch(`/api/play-listings/${listing.id}/responses/${responseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Ошибка");
      return;
    }
    if (status === "ACCEPTED") {
      setListing((l) => ({ ...l, status: "MATCHED" }));
    }
    setResponses((list) =>
      list.map((r) => (r.id === responseId ? { ...r, status } : r)),
    );
    router.refresh();
  }

  async function removeListing() {
    if (!confirm("Удалить объявление?")) return;
    const res = await fetch(`/api/play-listings/${listing.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Ошибка");
      return;
    }
    router.push("/pokatat?tab=mine");
  }

  return (
    <div className="space-y-6">
      <SiteCard>
        <div className="flex flex-wrap items-start gap-2">
          <span className="rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {PLAY_LISTING_KIND_LABELS[listing.kind]}
          </span>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {PLAY_LISTING_SCHEDULE_LABELS[listing.scheduleType]}
          </span>
          {listing.status !== "OPEN" && (
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
              {PLAY_LISTING_STATUS_LABELS[listing.status]}
            </span>
          )}
        </div>

        <h1 className="site-page-title mt-4">{listing.title}</h1>

        {listing.body && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {listing.body}
          </p>
        )}

        <dl className="mt-6 grid gap-4 border-t border-zinc-800 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Когда</dt>
            <dd className="mt-1 text-zinc-200">{schedule}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Где</dt>
            <dd className="mt-1 text-zinc-200">
              {listing.club ? (
                <Link href={`/clubs/${listing.club.id}`} className="text-emerald-400 hover:underline">
                  {listing.club.name}
                </Link>
              ) : (
                "Любой клуб"
              )}
              <span className="text-zinc-500"> · </span>
              {listing.city.nameRu}, {listing.city.country.nameRu}
            </dd>
          </div>
          {ratingRange && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Рейтинг партнёра
              </dt>
              <dd className="mt-1 text-zinc-200">{ratingRange}</dd>
            </div>
          )}
          {gameFormat && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Формат</dt>
              <dd className="mt-1 text-zinc-200">{gameFormat}</dd>
            </div>
          )}
          {listing.playersNeeded > 1 && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ищет</dt>
              <dd className="mt-1 text-zinc-200">{listing.playersNeeded} игроков</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-6">
          <Link
            href={`/players/${listing.author.id}`}
            className="flex items-center gap-3 hover:text-emerald-400"
          >
            {listing.author.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.author.photoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-400">
                {listing.author.firstName[0]}
              </span>
            )}
            <span>
              <span className="block font-medium text-zinc-100">
                {listing.author.lastName} {listing.author.firstName}
              </span>
              <span className="text-xs text-zinc-500">
                Рейтинг {formatRating(listing.author.rating)}
              </span>
            </span>
          </Link>

          {!isAuthor && listing.author.telegramUsername && isOpen && (
            <a
              href={`https://t.me/${listing.author.telegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="site-btn-secondary text-sm"
            >
              Написать в Telegram
            </a>
          )}
        </div>
      </SiteCard>

      {isAuthor && (
        <SiteCard>
          <h2 className="text-sm font-medium text-zinc-300">Управление объявлением</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.status === "OPEN" && (
              <AsyncButton
                onClick={() => updateStatus("MATCHED")}
                className="site-btn-secondary text-sm"
                loadingLabel="…"
              >
                Нашёл партнёра
              </AsyncButton>
            )}
            {listing.status !== "CLOSED" && (
              <AsyncButton
                onClick={() => updateStatus("CLOSED")}
                className="site-btn-ghost text-sm text-zinc-400"
                loadingLabel="…"
              >
                Закрыть
              </AsyncButton>
            )}
            <AsyncButton
              onClick={removeListing}
              className="text-sm text-red-400 hover:underline"
              loadingLabel="…"
            >
              Удалить
            </AsyncButton>
          </div>
        </SiteCard>
      )}

      {!isAuthor && isOpen && (
        <SiteCard>
          <h2 className="text-sm font-medium text-zinc-300">Откликнуться</h2>
          {!isLoggedIn ? (
            <p className="mt-2 text-sm text-zinc-400">
              <Link href={`/login?next=/pokatat/${listing.id}`} className="text-emerald-400 hover:underline">
                Войдите
              </Link>
              , чтобы откликнуться или написать автору.
            </p>
          ) : !isVerified ? (
            <p className="mt-2 text-sm text-amber-400/90">
              Подтвердите профиль через Telegram, чтобы откликнуться.
            </p>
          ) : listing.myResponseStatus && listing.myResponseStatus !== "WITHDRAWN" ? (
            <p className="mt-2 text-sm text-emerald-400">
              Вы откликнулись ·{" "}
              {PLAY_LISTING_RESPONSE_STATUS_LABELS[listing.myResponseStatus] ??
                listing.myResponseStatus}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Коротко о себе: рейтинг, когда удобно…"
                rows={3}
                maxLength={500}
                className="site-input w-full resize-y"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="button"
                onClick={respond}
                disabled={responding}
                className="site-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {responding ? "Отправка…" : "Откликнуться"}
              </button>
            </div>
          )}
        </SiteCard>
      )}

      {isAuthor && responses.length > 0 && (
        <section className="space-y-3">
          <h2 className="site-section-title">Отклики ({responses.length})</h2>
          {responses.map((r) => (
            <SiteCard key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/players/${r.player.id}`} className="hover:text-emerald-400">
                  <span className="font-medium text-zinc-100">
                    {r.player.lastName} {r.player.firstName}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {formatRating(r.player.rating)}
                  </span>
                </Link>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {PLAY_LISTING_RESPONSE_STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
              {r.message && (
                <p className="mt-2 text-sm text-zinc-400">{r.message}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "PENDING" && (
                  <>
                    <AsyncButton
                      onClick={() => updateResponse(r.id, "ACCEPTED")}
                      className="text-sm text-emerald-400 hover:underline"
                      loadingLabel="…"
                    >
                      Принять
                    </AsyncButton>
                    <AsyncButton
                      onClick={() => updateResponse(r.id, "DECLINED")}
                      className="text-sm text-zinc-400 hover:underline"
                      loadingLabel="…"
                    >
                      Отклонить
                    </AsyncButton>
                  </>
                )}
                {r.player.telegramUsername && (
                  <a
                    href={`https://t.me/${r.player.telegramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400/80 hover:underline"
                  >
                    Telegram
                  </a>
                )}
              </div>
            </SiteCard>
          ))}
        </section>
      )}

      <Link href="/pokatat" className="site-btn-ghost inline-flex text-sm">
        ← Все объявления
      </Link>
    </div>
  );
}
