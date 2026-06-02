"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import type { BracketFormatDefinition } from "@/lib/bracket-formats/catalog";
import { BRACKET_FORMAT_CATALOG } from "@/lib/bracket-formats/catalog";
import { adminTabClass } from "@/lib/admin-ui";
import { cn } from "@/lib/cn";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";

type FormatRow = BracketFormatDefinition & {
  tournamentCount: number;
  enabled: boolean;
  maintenanceMode: boolean;
};

interface ActiveTournament {
  id: string;
  name: string;
  status: string;
  clubName: string;
  format: string;
  matchCount: number;
}

const LAYOUT_LABELS = {
  olympic: "Олимпийская",
  swiss_dynamic: "Швейцарская, по турам",
  swiss_fixed: "Фикс. швейцарская",
} as const;

export function BracketsAdminPage() {
  const [formats, setFormats] = useState<FormatRow[]>(
    BRACKET_FORMAT_CATALOG.map((f) => ({
      ...f,
      tournamentCount: 0,
      enabled: true,
      maintenanceMode: false,
    })),
  );
  const [activeTournaments, setActiveTournaments] = useState<ActiveTournament[]>([]);
  const [tab, setTab] = useState<"formats" | "tournaments">("formats");
  const [loading, setLoading] = useState(true);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const load = useCallback(() => {
    return Promise.all([
      fetch("/api/admin/bracket-formats").then((r) => r.json()),
      fetch("/api/tournaments").then((r) => r.json()),
    ]).then(([formatsData, tournaments]) => {
      if (formatsData.formats) setFormats(formatsData.formats);
      const list = Array.isArray(tournaments) ? tournaments : [];
      const active = list
        .filter(
          (t: { status: string; matches?: { length?: number } }) =>
            t.status === "ACTIVE" || (t.matches?.length ?? 0) > 0,
        )
        .map((t: ActiveTournament & { club: { name: string }; matches: unknown[] }) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          clubName: t.club?.name ?? "—",
          format: t.format,
          matchCount: Array.isArray(t.matches) ? t.matches.length : 0,
        }));
      setActiveTournaments(active);
    });
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  function applySettingsFromResponse(
    settings: Record<string, { enabled: boolean; maintenanceMode: boolean }>,
  ) {
    setFormats((prev) =>
      prev.map((f) => {
        const s = settings[f.code];
        if (!s) return f;
        return { ...f, enabled: s.enabled, maintenanceMode: s.maintenanceMode };
      }),
    );
  }

  async function patchFormatSettings(
    formatCode: string,
    patch: { enabled?: boolean; maintenanceMode?: boolean },
  ) {
    setToggleError(null);
    setFormats((prev) =>
      prev.map((f) =>
        f.code === formatCode
          ? {
              ...f,
              ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
              ...(patch.maintenanceMode !== undefined
                ? { maintenanceMode: patch.maintenanceMode }
                : {}),
            }
          : f,
      ),
    );
    const res = await fetch("/api/admin/bracket-formats/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formatCode, ...patch }),
    });
    const json = await res.json();
    if (!res.ok) {
      setToggleError(json.error ?? "Не удалось сохранить");
      await load();
      return;
    }
    if (json.settings) applySettingsFromResponse(json.settings);
  }

  if (loading) {
    return <p className="admin-muted text-sm">Загрузка…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="admin-page-title mb-2">Сетки</h1>
        <p className="admin-page-lead max-w-3xl">
          Типы турнирных сеток (те же, что при создании турнира). Здесь — описание, код,
          документация и турниры по каждому формату.           Выключенный тип скрыт в форме турнира. На техобслуживании — тоже скрыт при создании.
        </p>
      </div>

      {toggleError && (
        <p className="admin-error-text" role="alert">
          {toggleError}
        </p>
      )}

      <div className="admin-tab-bar">
        <button
          type="button"
          className={adminTabClass(tab === "formats")}
          onClick={() => setTab("formats")}
        >
          Типы сеток ({formats.length})
        </button>
        <button
          type="button"
          className={adminTabClass(tab === "tournaments")}
          onClick={() => setTab("tournaments")}
        >
          Турниры с сеткой
          {activeTournaments.length > 0 ? ` (${activeTournaments.length})` : ""}
        </button>
      </div>

      {tab === "formats" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {formats.map((f) => (
            <div
              key={f.code}
              className={cn(
                "admin-card admin-card-interactive admin-bracket-format-card overflow-hidden",
                !f.enabled && "admin-bracket-format-card--off",
                f.maintenanceMode && f.enabled && "admin-bracket-format-card--maintenance",
                f.isReference && !f.maintenanceMode && "admin-bracket-format-card--ref",
              )}
            >
              <div className="admin-bracket-format-card__toolbar flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={f.enabled}
                      onChange={(e) =>
                        patchFormatSettings(f.code, { enabled: e.target.checked })
                      }
                    />
                    <span className="font-medium text-[var(--admin-text)]">
                      {f.enabled ? "Включён в создании турнира" : "Выключен"}
                    </span>
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 text-sm",
                      !f.enabled && "pointer-events-none opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={f.maintenanceMode}
                      disabled={!f.enabled}
                      onChange={(e) =>
                        patchFormatSettings(f.code, {
                          maintenanceMode: e.target.checked,
                        })
                      }
                    />
                    <span className="text-[var(--admin-text-secondary)]">
                      Техобслуживание (нельзя выбрать в новом турнире)
                    </span>
                  </label>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {f.maintenanceMode && f.enabled && (
                    <span className="admin-bracket-maint-chip">техобслуживание</span>
                  )}
                  {!f.enabled && <span className="admin-notify-chip">выкл</span>}
                  {f.isReference && (
                    <span className="admin-pill--ok text-[10px] font-medium uppercase">
                      Эталон
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/admin/brackets/formats/${f.code}`}
                className="admin-bracket-format-card__body"
              >
                <h2 className="admin-bracket-format-card__title">{f.adminLabel}</h2>
                {f.maintenanceMode && f.enabled && (
                  <p className="admin-muted mt-1 text-xs">
                    Сетка на техобслуживании — для новых турниров недоступна.
                  </p>
                )}
                <p className="admin-text-secondary mt-2 text-sm">{f.shortDescription}</p>
                <dl className="admin-muted mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <dt className="inline">Код: </dt>
                    <dd className="admin-code inline">{f.code}</dd>
                  </div>
                  <div>
                    <dt className="inline">Турниров: </dt>
                    <dd className="inline tabular-nums text-[var(--admin-text)]">
                      {f.tournamentCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Состав: </dt>
                    <dd className="inline text-[var(--admin-text)]">
                      {f.pairing === "pair" ? "Парный" : "Одиночный"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Схема: </dt>
                    <dd className="inline text-[var(--admin-text)]">
                      {LAYOUT_LABELS[f.layout]}
                    </dd>
                  </div>
                </dl>
                <p className="admin-link mt-3 text-xs font-medium">
                  Открыть управление форматом →
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "tournaments" && (
        <div className="admin-table-wrap overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="admin-muted border-b border-[var(--admin-border)] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Турнир</th>
                <th className="px-4 py-3 font-medium">Клуб</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Встреч</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {activeTournaments.map((t) => (
                <tr
                  key={t.id}
                  className="admin-table-row border-t border-[var(--admin-border)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{t.name}</td>
                  <td className="admin-text-secondary px-4 py-3">{t.clubName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={t.status}
                      label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
                    />
                  </td>
                  <td className="admin-text-secondary px-4 py-3 tabular-nums">
                    {t.matchCount > 0 ? t.matchCount : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/brackets/tournament/${t.id}`}
                        className="admin-btn admin-btn--primary text-xs"
                      >
                        Ведение сетки
                      </Link>
                      <Link
                        href={`/admin/brackets/formats/${t.format}`}
                        className="admin-link text-xs"
                      >
                        Тип сетки
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeTournaments.length === 0 && (
            <p className="admin-muted py-10 text-center text-sm">
              Нет идущих турниров с сеткой. Создайте турнир в разделе{" "}
              <Link href="/admin/tournaments" className="admin-link">
                Турниры
              </Link>
              .
            </p>
          )}
        </div>
      )}

      <p className="admin-muted text-xs">
        Новый тип сетки: запись в{" "}
        <code className="admin-code">src/lib/bracket-formats/catalog.ts</code> — появится
        здесь и в форме создания турнира (если включён и не на техобслуживании).
      </p>
    </div>
  );
}
