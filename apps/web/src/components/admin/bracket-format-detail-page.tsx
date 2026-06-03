"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import type { BracketFormatDefinition } from "@/lib/bracket-formats/catalog";
import { BracketParticipantLimitEditor } from "@/components/admin/bracket-participant-limit-editor";
import {
  resolveBracketParticipantRules,
  type BracketParticipantRules,
} from "@/lib/bracket-participant-rules";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";
import { cn } from "@/lib/cn";
import { ConfirmModal } from "@/components/bracket/confirm-modal";

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
  const router = useRouter();
  const [format, setFormat] = useState<
    | (BracketFormatDefinition & {
        tournamentCount: number;
        enabled: boolean;
        maintenanceMode: boolean;
        hiddenInAdmin: boolean;
        participantMin: number | null;
        participantMax: number | null;
        participantExact: number | null;
        participantRules: BracketParticipantRules;
      })
    | null
  >(null);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TournamentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [hideFormatOpen, setHideFormatOpen] = useState(false);
  const [hideFormatLoading, setHideFormatLoading] = useState(false);

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

  async function patchSettings(patch: {
    enabled?: boolean;
    maintenanceMode?: boolean;
    hiddenInAdmin?: boolean;
    participantMin?: number | null;
    participantMax?: number | null;
    participantExact?: number | null;
    resetParticipantLimits?: boolean;
  }) {
    if (!format) return;
    const prev = format;
    if (
      patch.participantMin !== undefined ||
      patch.participantMax !== undefined ||
      patch.participantExact !== undefined ||
      patch.resetParticipantLimits
    ) {
      setSavingParticipants(true);
    } else {
      setFormat({ ...format, ...patch });
    }
    const res = await fetch("/api/admin/bracket-formats/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formatCode: format.code, ...patch }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Не удалось сохранить");
      setFormat(prev);
      setSavingParticipants(false);
      return;
    }
    const s = json.settings?.[format.code];
    if (s) {
      setFormat((f) =>
        f
          ? {
              ...f,
              enabled: s.enabled,
              maintenanceMode: s.maintenanceMode,
              hiddenInAdmin: s.hiddenInAdmin,
              participantMin: s.participantMin,
              participantMax: s.participantMax,
              participantExact: s.participantExact,
              participantRules: resolveBracketParticipantRules(f.code, s),
            }
          : f,
      );
    }
    setSavingParticipants(false);
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function confirmDeleteBracket() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await fetch("/api/tournaments/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: deleteTarget.id, deleteBracket: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setDeleteError(json.error ?? "Не удалось удалить сетку");
      setDeleteLoading(false);
      return;
    }
    setTournaments((rows) => rows.filter((t) => t.id !== deleteTarget.id));
    setFormat((f) => (f ? { ...f, tournamentCount: Math.max(0, f.tournamentCount - 1) } : f));
    setDeleteTarget(null);
    setDeleteLoading(false);
  }

  async function confirmHideFormatType() {
    if (!format) return;
    setHideFormatLoading(true);
    const res = await fetch("/api/admin/bracket-formats/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formatCode: format.code,
        hiddenInAdmin: true,
        enabled: false,
      }),
    });
    setHideFormatLoading(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Не удалось убрать тип");
      setHideFormatOpen(false);
      return;
    }
    router.push("/admin/brackets");
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
          {format.hiddenInAdmin && (
            <span className="admin-notify-chip">убран из списка</span>
          )}
        </div>
        <p className="admin-code mt-2 text-sm">{format.code}</p>
        <p className="admin-page-lead mt-2">{format.shortDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {format.hiddenInAdmin ? (
            <button
              type="button"
              className="admin-btn admin-btn--outline px-3 py-1.5 text-sm"
              onClick={async () => {
                await patchSettings({ hiddenInAdmin: false });
              }}
            >
              Вернуть в список типов
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn--danger px-3 py-1.5 text-sm"
              onClick={() => setHideFormatOpen(true)}
            >
              Убрать из списка типов
            </button>
          )}
        </div>
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
        <h2 className="admin-section-title mb-1">Снести сетку (турнир остаётся)</h2>
        <p className="admin-muted mb-4 text-sm">
          Удаляются <strong className="text-[var(--admin-text)]">только встречи</strong> — не
          турнир, не участники. После сноса турнир пропадёт из этого списка; карточка останется в{" "}
          <Link href="/admin/tournaments" className="admin-link">
            Турниры
          </Link>
          .
        </p>
        {tournaments.length === 0 ? (
          <div className="admin-muted space-y-3 rounded-lg border border-dashed border-[var(--admin-border)] px-4 py-5 text-sm">
            <p>
              Сейчас нет турниров формата <code className="admin-code">{format.code}</code> с
              сформированной сеткой.
            </p>
            <p>
              Сетка у другого типа (FIXED_SWISS, PAIR_SWISS, олимпийка…)? Откройте его карточку в{" "}
              <Link href="/admin/brackets" className="admin-link">
                Типы сеток
              </Link>{" "}
              или{" "}
              <Link href="/admin/brackets?tab=tournaments" className="admin-link">
                все турниры с сеткой
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--admin-text)]">{t.name}</p>
                  <p className="admin-muted mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                    <span>{t.clubName}</span>
                    <span aria-hidden>·</span>
                    <StatusBadge
                      status={t.status}
                      label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
                    />
                    <span aria-hidden>·</span>
                    <span>{t.matchCount} встреч</span>
                    <span aria-hidden>·</span>
                    <span>обновлён {formatAdminDate(t.updatedAt)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger px-3 py-1.5 text-sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(t);
                    }}
                  >
                    Снести сетку
                  </button>
                  <Link
                    href={`/admin/brackets/tournament/${t.id}`}
                    className="admin-btn admin-btn--outline px-3 py-1.5 text-sm"
                  >
                    Ведение сетки
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          <div className="sm:col-span-2">
            <dt className="admin-muted text-xs">Участники при формировании</dt>
            <dd className="text-[var(--admin-text)]">{format.participantRules.label}</dd>
            <dd className="admin-muted mt-1 text-xs">{format.participantRules.hint}</dd>
          </div>
          <div>
            <dt className="admin-muted text-xs">С сеткой</dt>
            <dd className="tabular-nums text-[var(--admin-text)]">{format.tournamentCount}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <BracketParticipantLimitEditor
            formatCode={format.code}
            participantMin={format.participantMin}
            participantMax={format.participantMax}
            participantExact={format.participantExact}
            participantRules={format.participantRules}
            saving={savingParticipants}
            onSave={(payload) => patchSettings(payload)}
            onReset={() => patchSettings({ resetParticipantLimits: true })}
          />
        </div>
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

      <ConfirmModal
        open={hideFormatOpen}
        title="Убрать тип сетки из списка?"
        description={`«${format.adminLabel}» исчезнет из раздела «Типы сеток». Турниры с форматом ${format.code} не удаляются.`}
        confirmLabel="Да, убрать"
        variant="danger"
        loading={hideFormatLoading}
        onConfirm={confirmHideFormatType}
        onClose={() => {
          if (hideFormatLoading) return;
          setHideFormatOpen(false);
        }}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Снести сетку? Турнир останется"
        description={
          deleteTarget
            ? `У «${deleteTarget.name}» будут удалены только ${deleteTarget.matchCount} встреч. Турнир, участники и регистрации не трогаем — сетку можно собрать заново.`
            : ""
        }
        confirmLabel="Да, снести сетку"
        variant="danger"
        loading={deleteLoading}
        error={deleteError}
        onConfirm={confirmDeleteBracket}
        onClose={closeDeleteModal}
      />
    </div>
  );
}
