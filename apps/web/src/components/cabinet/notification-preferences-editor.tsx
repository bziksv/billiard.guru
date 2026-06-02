"use client";

import { useCallback, useEffect, useState } from "react";
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
  categoryLabel: string;
  items: PreferenceItem[];
};

type PreferencesResponse = {
  hasTelegram: boolean;
  groups: PreferenceGroup[];
};

export function NotificationPreferencesEditor() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreferencesResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/me/notification-preferences");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Не удалось загрузить настройки");
      return;
    }
    setData(json as PreferencesResponse);
  }, []);

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
      setError(json.error ?? "Не удалось сохранить");
      return;
    }
    setData(json as PreferencesResponse);
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  if (!data) {
    return error ? <p className="text-sm text-red-600">{error}</p> : null;
  }

  return (
    <section className="site-card space-y-5 p-5">
      <div>
        <h2 className="site-section-title text-lg">Уведомления в Telegram</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Выберите, о чём присылать сообщения в бот. По умолчанию включены все типы, кроме
          обязательных.
        </p>
        {!data.hasTelegram && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Telegram не привязан — уведомления не дойдут, пока вы не подтвердите аккаунт в боте
            (регистрация или вход на сайте).
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        {data.groups.map((group) => (
          <div key={group.categoryLabel}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {group.categoryLabel}
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
                      aria-label={item.title}
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
                    <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                    {item.locked && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Нельзя отключить — нужно для безопасного входа на сайт
                      </p>
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
