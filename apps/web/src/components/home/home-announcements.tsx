"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeAnnouncement } from "@/lib/home-content";

export function HomeAnnouncements({
  playerAds,
  clubAds,
  pokatatHref,
}: {
  playerAds: HomeAnnouncement[];
  clubAds: HomeAnnouncement[];
  pokatatHref?: string;
}) {
  const [tab, setTab] = useState<"player" | "club">("player");
  const items = tab === "player" ? playerAds : clubAds;

  return (
    <div>
      <div className="home-tab-bar mb-6 inline-flex rounded-xl p-1">
        <button
          type="button"
          onClick={() => setTab("player")}
          className={
            tab === "player"
              ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              : "home-card-body rounded-lg px-4 py-2 text-sm hover:text-[var(--text-primary)]"
          }
        >
          От игроков
        </button>
        <button
          type="button"
          onClick={() => setTab("club")}
          className={
            tab === "club"
              ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              : "home-card-body rounded-lg px-4 py-2 text-sm hover:text-[var(--text-primary)]"
          }
        >
          От клубов
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((ad) => (
          <li key={ad.id}>
            {ad.href ? (
              <Link href={ad.href} className="home-content-card block rounded-xl p-4 transition hover:border-emerald-800/50">
                <AnnouncementBody ad={ad} />
              </Link>
            ) : (
              <div className="home-content-card rounded-xl p-4">
                <AnnouncementBody ad={ad} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="home-card-body mt-6 text-sm">
        {pokatatHref ? (
          <>
            Ищете партнёра?{" "}
            <Link href={pokatatHref} className="font-medium text-emerald-400 hover:underline">
              Покатать
            </Link>
            {" — "}опубликуйте объявление или откликнитесь на чужое.
          </>
        ) : (
          <>
            Объявления, цены и фото клуба — в профиле. Оценки клубов от игроков появятся в
            следующих обновлениях.
          </>
        )}
      </p>
    </div>
  );
}

function AnnouncementBody({ ad }: { ad: HomeAnnouncement }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="home-card-title font-medium">{ad.title}</h3>
        {ad.preview && <span className="home-preview-label shrink-0">пример</span>}
      </div>
      <p className="home-card-body mt-2 text-sm">{ad.body}</p>
      <p className="home-card-muted mt-3 text-xs">{ad.meta}</p>
    </>
  );
}
