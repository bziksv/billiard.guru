"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import { adminTabClass } from "@/lib/admin-ui";
import { FORMAT_OPTIONS, type AdminTournament } from "@/lib/tournament-admin";
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/validators";

const CURRENT_STATUSES = new Set([
  "DRAFT",
  "PENDING_CLUB_APPROVAL",
  "OPEN",
  "ACTIVE",
]);

export function ClubOwnerTournamentsPage({ clubId }: { clubId: string }) {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFormat, setNewFormat] = useState("OLYMPIC");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"create" | "current" | "finished">("current");

  async function reloadTournaments() {
    const t = await fetch("/api/tournaments").then((r) => r.json());
    setTournaments(Array.isArray(t) ? t : []);
  }

  useEffect(() => {
    reloadTournaments().finally(() => setLoading(false));
  }, []);

  const clubTournaments = useMemo(
    () => tournaments.filter((t) => t.club.id === clubId),
    [tournaments, clubId],
  );

  const currentTournaments = useMemo(
    () => clubTournaments.filter((t) => CURRENT_STATUSES.has(t.status)),
    [clubTournaments],
  );

  const finishedTournaments = useMemo(
    () => clubTournaments.filter((t) => t.status === "FINISHED"),
    [clubTournaments],
  );

  async function createTournament(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setCreateMessage(null);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
        clubId,
        format: newFormat,
        startsAt: form.get("startsAt") || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateMessage(data.error ?? "Ошибка создания");
      return;
    }
    await reloadTournaments();
    setNewFormat("OLYMPIC");
    formEl.reset();
    setCreateMessage(
      data.message ??
        "Турнир создан. Подтвердите публикацию в Telegram, если пришёл запрос.",
    );
    setTab("current");
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Турниры</h1>
        <SectionLogsButton section="tournaments" clubId={clubId} />
      </div>

      <div className="admin-tab-bar">
        <button
          type="button"
          onClick={() => setTab("create")}
          className={adminTabClass(tab === "create")}
        >
          Создать
        </button>
        <button
          type="button"
          onClick={() => setTab("current")}
          className={adminTabClass(tab === "current")}
        >
          Текущие{currentTournaments.length > 0 ? ` (${currentTournaments.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("finished")}
          className={adminTabClass(tab === "finished")}
        >
          Завершённые{finishedTournaments.length > 0 ? ` (${finishedTournaments.length})` : ""}
        </button>
      </div>

      {tab === "create" && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-1 text-lg font-semibold">Создать турнир</h2>
          <p className="mb-5 text-sm text-zinc-500">
            После создания в Telegram придёт запрос на публикацию турнира.
          </p>
          <form onSubmit={createTournament} className="grid max-w-3xl gap-3">
            <input
              name="name"
              required
              placeholder="Название турнира"
              className="site-input w-full"
            />
            <select
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              className="site-input w-full"
              required
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <textarea
              name="description"
              rows={4}
              placeholder="Описание турнира"
              className="site-input w-full resize-y"
            />
            <input name="startsAt" type="datetime-local" className="site-input w-full" />
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500"
              >
                Создать
              </button>
              {createMessage && (
                <p
                  className={`text-sm ${
                    createMessage.toLowerCase().includes("ошиб")
                      ? "text-red-400"
                      : "text-emerald-400"
                  }`}
                >
                  {createMessage}
                </p>
              )}
            </div>
          </form>
        </section>
      )}

      {tab === "current" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Текущие турниры</h2>
          {currentTournaments.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет активных турниров.</p>
          ) : (
            currentTournaments.map((t) => (
              <TournamentRow key={t.id} tournament={t} clubId={clubId} />
            ))
          )}
        </section>
      )}

      {tab === "finished" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Завершённые</h2>
          {finishedTournaments.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет завершённых турниров.</p>
          ) : (
            finishedTournaments.map((t) => (
              <TournamentRow key={t.id} tournament={t} clubId={clubId} />
            ))
          )}
        </section>
      )}
    </div>
  );
}

function TournamentRow({
  tournament: t,
  clubId,
}: {
  tournament: AdminTournament;
  clubId: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t.name}</h3>
            <StatusBadge
              status={t.status}
              label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
            />
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {TOURNAMENT_FORMAT_LABELS[t.format]}
          </p>
          {t.startsAt && (
            <p className="mt-1 text-xs text-zinc-500">{formatAdminDate(t.startsAt)}</p>
          )}
        </div>
        <Link
          href={`/manage/clubs/${clubId}/tournaments/${t.id}`}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-600"
        >
          Управление
        </Link>
      </div>
    </div>
  );
}
