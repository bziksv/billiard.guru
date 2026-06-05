"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeAnnouncement } from "@/lib/home-content";

export function HomeAnnouncements({
  playerAds,
  clubAds,
  pokatatHref = "/pokatat",
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
          {playerAds.length > 0 && (
            <span className="ml-1.5 opacity-80">({playerAds.length})</span>
          )}
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
          {clubAds.length > 0 && (
            <span className="ml-1.5 opacity-80">({clubAds.length})</span>
          )}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="home-content-card rounded-2xl px-6 py-10 text-center">
          <p className="home-card-title font-medium">
            {tab === "player" ? "Объявлений от игроков пока нет" : "Объявлений от клубов пока нет"}
          </p>
          <p className="home-card-body mx-auto mt-2 max-w-md text-sm">
            {tab === "player"
              ? "Опубликуйте «Покатать» — спарринг, напарник или регулярные игры в вашем городе."
              : "Клубы могут размещать свободные столы и приглашения поиграть через «Покатать»."}
          </p>
          <Link href={pokatatHref} className="site-btn-primary mt-5 inline-flex">
            Перейти в «Покатать»
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((ad) => (
            <li key={ad.id}>
              {ad.href ? (
                <Link
                  href={ad.href}
                  className="home-content-card block rounded-xl p-4 transition hover:border-emerald-800/50"
                >
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
      )}

      <p className="home-card-body mt-6 text-sm">
        Ищете партнёра?{" "}
        <Link href={pokatatHref} className="font-medium text-emerald-400 hover:underline">
          Покатать
        </Link>
        {" — "}опубликуйте объявление или откликнитесь на чужое. Доступно на сайте и в
        Telegram-боте.
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
