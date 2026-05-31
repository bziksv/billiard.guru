"use client";

import { useState } from "react";
import type { HomeAnnouncement } from "@/lib/home-content";

export function HomeAnnouncements({
  playerAds,
  clubAds,
}: {
  playerAds: HomeAnnouncement[];
  clubAds: HomeAnnouncement[];
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
          <li key={ad.id} className="home-content-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="home-card-title font-medium">{ad.title}</h3>
              {ad.preview && (
                <span className="home-preview-label shrink-0">пример</span>
              )}
            </div>
            <p className="home-card-body mt-2 text-sm">{ad.body}</p>
            <p className="home-card-muted mt-3 text-xs">{ad.meta}</p>
          </li>
        ))}
      </ul>

      <p className="home-card-body mt-6 text-sm">
        Объявления, цены и фото клуба — в профиле. Оценки клубов от игроков появятся в
        следующих обновлениях.
      </p>
    </div>
  );
}
