"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import type { BracketFormatDefinition } from "@/lib/bracket-formats/catalog";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";
import { cn } from "@/lib/cn";

interface TournamentRow {
  id: string;
  name: string;
  status: string;
  clubName: string;
  matchCount: number;
  updatedAt: string;
}

const LAYOUT_LABELS = {
  olympic: "Олимпийская (на выбывание)",
  swiss_dynamic: "Швейцарская по турам",
  swiss_fixed: "Фиксированная швейцарская",
} as const;

export function BracketFormatDetailPage({ formatCode }: { formatCode: string }) {
  const [format, setFormat] = useState<
    | (BracketFormatDefinition & {
        tournamentCount: number;
        enabled: boolean;
        maintenanceMode: boolean;
      })
    | null
  >(null);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/bracket-formats?format=${encodeURIComponent(formatCode)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Не найдено");
        setFormat(json.format);
        setTournaments(json.tournaments ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [formatCode]);

  const guide = useMemo(() => {
    if (!format?.guideSectionId) return null;
    return TOURNAMENT_BRACKETS_SECTIONS.find((s) => s.id === format.guideSectionId);
  }, [format]);

  async function patchSettings(patch: { enabled?: boolean; maintenanceMode?: boolean }) {
    if (!format) return;
    const prev = format;
    setFormat({ ...format, ...patch });
    const res = await fetch("/api/admin/bracket-formats/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formatCode: format.code, ...patch }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Не удалось сохранить");
      setFormat(prev);
    }
  }

  if (loading) return <p className="admin-muted text-sm">Загрузка…</p>;
  if (error || !format) {
    return (
      <div>
        <Link href="/admin/brackets" className="admin-link text-sm">
          ← Сетки
        </Link>
        <p className="admin-error-text mt-4">{error ?? "Формат не найден"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/brackets" className="admin-link text-sm">
          ← Типы сеток
        </Link>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <h1 className="admin-page-title">{format.adminLabel}</h1>
          {format.isReference && (
            <span className="admin-pill--ok text-xs font-medium">Эталон отрисовки</span>
          )}
          {!format.enabled && <span className="admin-notify-chip">выкл</span>}
          {format.maintenanceMode && format.enabled && (
            <span className="admin-bracket-maint-chip">техобслуживание</span>
          )}
        </div>
        <p className="admin-code mt-2 text-sm">{format.code}</p>
        <p className="admin-page-lead mt-2">{format.shortDescription}</p>
        <div className="admin-card admin-inset mt-4 space-y-3 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={format.enabled}
              onChange={(e) => patchSettings({ enabled: e.target.checked })}
            />
            <span className="font-medium text-[var(--admin-text)]">
              Включён в создании турнира
            </span>
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 text-sm",
              !format.enabled && "pointer-events-none opacity-50",
            )}
          >
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={format.maintenanceMode}
              disabled={!format.enabled}
              onChange={(e) => patchSettings({ maintenanceMode: e.target.checked })}
            />
            <span className="text-[var(--admin-text-secondary)]">
              Техобслуживание (нельзя выбрать в новом турнире)
            </span>
          </label>
        </div>
      </div>

      <section className="admin-card p-5">
        <h2 className="admin-label mb-3 uppercase tracking-wide">Параметры</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="admin-muted text-xs">Состав</dt>
            <dd className="text-[var(--admin-text)]">
              {format.pairing === "pair" ? "Парный турнир" : "Одиночный"}
            </dd>
          </div>
          <div>
            <dt className="admin-muted text-xs">Логика сетки</dt>
            <dd className="text-[var(--admin-text)]">{LAYOUT_LABELS[format.layout]}</dd>
          </div>
          <div>
            <dt className="admin-muted text-xs">Турниров в базе</dt>
            <dd className="tabular-nums text-[var(--admin-text)]">{format.tournamentCount}</dd>
          </div>
        </dl>
      </section>

      {format.docPaths && format.docPaths.length > 0 && (
        <section className="admin-card p-5">
          <h2 className="admin-label mb-3 uppercase tracking-wide">Документация</h2>
          <ul className="space-y-1 text-sm">
            {format.docPaths.map((path) => (
              <li key={path}>
                <code className="admin-code">{path}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="admin-card p-5">
        <h2 className="admin-label mb-3 uppercase tracking-wide">Код</h2>
        <ul className="admin-code space-y-1 text-xs">
          {format.implementation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {format.testCommand && (
          <pre className="admin-notify-pre mt-4 overflow-x-auto">{format.testCommand}</pre>
        )}
      </section>

      {guide && (
        <section className="admin-card p-5">
          <h2 className="admin-section-title mb-3">{guide.title}</h2>
          {guide.paragraphs?.map((p) => (
            <p key={p.slice(0, 40)} className="admin-text-secondary mb-2 text-sm">
              {p}
            </p>
          ))}
          {guide.bullets && (
            <ul className="admin-muted mt-2 list-disc space-y-1 pl-5 text-sm">
              {guide.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <Link
            href="/brackets"
            className="admin-link mt-4 inline-block text-sm font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Полный справочник на сайте →
          </Link>
        </section>
      )}

      <section>
        <h2 className="admin-section-title mb-4">Турниры с этим форматом</h2>
        <div className="admin-table-wrap overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="admin-muted border-b border-[var(--admin-border)] text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Турнир</th>
                <th className="px-4 py-3 font-medium">Клуб</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Встреч</th>
                <th className="px-4 py-3 font-medium">Обновлён</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
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
                    {t.matchCount}
                  </td>
                  <td className="admin-muted px-4 py-3 text-xs">
                    {formatAdminDate(t.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/brackets/tournament/${t.id}`}
                      className={cn(
                        "text-xs font-medium",
                        t.status === "ACTIVE" || t.matchCount > 0
                          ? "admin-link"
                          : "admin-link-muted",
                      )}
                    >
                      Ведение сетки
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tournaments.length === 0 && (
            <p className="admin-muted py-8 text-center text-sm">
              Турниров с этим форматом пока нет.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
