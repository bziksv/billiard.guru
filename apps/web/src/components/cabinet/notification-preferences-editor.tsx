"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type PreferenceItem = {
  id: string;
  title: string;
  description: string;
  categoryLabel: string;
  enabled: boolean;
  locked: boolean;
};

type PreferenceGroup = {
  category: string;
  categoryLabel: string;
  items: PreferenceItem[];
};

type PreferencesResponse = {
  hasTelegram: boolean;
  groups: PreferenceGroup[];
};

export function NotificationPreferencesEditor() {
  const t = useTranslations("pages.cabinet");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreferencesResponse | null>(null);

  function itemTitle(item: PreferenceItem) {
    const key = `notificationItems.${item.id}.title` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : item.title;
  }

  function itemDescription(item: PreferenceItem) {
    const key = `notificationItems.${item.id}.description` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : item.description;
  }

  function categoryLabel(group: PreferenceGroup) {
    const key = `notificationCategories.${group.category}` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : group.categoryLabel;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/me/notification-preferences");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? t("loadError"));
      return;
    }
    setData(json as PreferencesResponse);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: PreferenceItem, nextEnabled: boolean) {
    if (item.locked) return;
    setSavingId(item.id);
    setError(null);

    const res = await fetch("/api/me/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: item.id, enabled: nextEnabled }),
    });
    const json = await res.json();
    setSavingId(null);

    if (!res.ok) {
      setError(json.error ?? t("saveError"));
      return;
    }
    setData(json as PreferencesResponse);
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("loading")}</p>;
  }

  if (!data) {
    return error ? <p className="text-sm text-red-600">{error}</p> : null;
  }

  return (
    <section className="site-card space-y-5 p-5">
      <div>
        <h2 className="site-section-title text-lg">{t("notificationsTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t("notificationsLead")}</p>
        {!data.hasTelegram && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            {t("notificationsNoTelegram")}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        {data.groups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {categoryLabel(group)}
            </h3>
            <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800/80">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-4 px-4 py-3",
                    item.locked && "bg-zinc-900/40",
                  )}
                >
                  <label
                    className={cn(
                      "relative mt-0.5 flex h-5 w-9 shrink-0 items-center",
                      item.locked ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={item.enabled}
                      disabled={item.locked || savingId === item.id}
                      onChange={(e) => void toggle(item, e.target.checked)}
                      aria-label={itemTitle(item)}
                    />
                    <span
                      className={cn(
                        "h-5 w-9 rounded-full bg-zinc-700 transition-colors",
                        "peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50",
                        "peer-disabled:opacity-70",
                        "after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform",
                        "peer-checked:after:translate-x-4",
                      )}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100">{itemTitle(item)}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{itemDescription(item)}</p>
                    {item.locked && (
                      <p className="mt-1 text-xs text-zinc-400">{t("notificationsLocked")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
