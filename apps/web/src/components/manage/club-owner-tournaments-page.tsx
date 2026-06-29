"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import { adminTabClass } from "@/lib/admin-ui";
import type { AdminTournament } from "@/lib/tournament-admin";
import {
  firstSelectableFormat,
  useBracketFormatOptions,
} from "@/hooks/use-bracket-format-options";
import { formatRating, MAX_PLAYER_RATING, RATING_STEP } from "@/lib/rating";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useTournamentDefaults } from "@/hooks/use-tournament-defaults";
import {
  TOURNAMENT_RATING_SOURCE_OPTIONS,
  tournamentRatingSourceHint,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";
import { TournamentTablePicker } from "@/components/tournament/tournament-table-picker";
import { DisciplinePicker } from "@/components/admin/discipline-picker";

const CURRENT_STATUSES = new Set([
  "DRAFT",
  "PENDING_CLUB_APPROVAL",
  "OPEN",
  "ACTIVE",
]);

export function ClubOwnerTournamentsPage({ clubId }: { clubId: string }) {
  const { defaults: tournamentDefaults, ready: defaultsReady } =
    useTournamentDefaults();
  const {
    options: formatOptions,
    loading: formatOptionsLoading,
    reload: reloadFormatOptions,
  } = useBracketFormatOptions();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFormat, setNewFormat] = useState("OLYMPIC");
  const [newIsPair, setNewIsPair] = useState(false);
  const [newDiscipline, setNewDiscipline] = useState<string | null>(null);
  const [newGameType, setNewGameType] = useState<string | null>(null);
  const [disciplineInvalid, setDisciplineInvalid] = useState(false);
  const [ratingSource, setRatingSource] = useState<TournamentRatingSource>("CLUB");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [tableStreams, setTableStreams] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"create" | "current" | "finished">("current");

  async function reloadTournaments() {
    const t = await fetch("/api/tournaments").then((r) => r.json());
    setTournaments(Array.isArray(t) ? t : []);
  }

  useEffect(() => {
    reloadTournaments().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "create") reloadFormatOptions();
  }, [tab, reloadFormatOptions]);

  useEffect(() => {
    if (defaultsReady) setRatingSource(tournamentDefaults.ratingSource);
  }, [defaultsReady, tournamentDefaults.ratingSource]);

  useEffect(() => {
    const current = formatOptions.find((o) => o.value === newFormat);
    if (current?.disabled || !current) {
      const first = firstSelectableFormat(formatOptions);
      if (first) setNewFormat(first);
    }
  }, [formatOptions, newFormat]);

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
    if (!newDiscipline || !newGameType) {
      setDisciplineInvalid(true);
      setCreateMessage("Выберите тип игры (дисциплину) и вид игры");
      return;
    }
    if (selectedTableIds.length === 0) {
      setCreateMessage("Выберите хотя бы один стол");
      return;
    }
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setCreateMessage(null);
    setCreating(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description") || undefined,
          clubId,
          format: newFormat,
          isPair: newIsPair,
          discipline: newDiscipline,
          gameType: newGameType,
          startsAt: form.get("startsAt") || undefined,
          ratingMax: tournamentDefaults.limitByRating
            ? Number(form.get("ratingMax"))
            : null,
          ratingSource: tournamentDefaults.limitByRating ? ratingSource : "CLUB",
          handicapHalfStep: form.get("handicapHalfStep") === "on",
          suppressNotifications: form.get("suppressNotifications") === "on",
          tableIds: selectedTableIds,
          tableStreams,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateMessage(data.error ?? `Ошибка создания (${res.status})`);
        return;
      }
      await reloadTournaments();
      setNewFormat("OLYMPIC");
      setNewIsPair(false);
      setNewDiscipline(null);
      setNewGameType(null);
      setDisciplineInvalid(false);
      setSelectedTableIds([]);
      setTableStreams({});
      formEl.reset();
      setCreateMessage(
        data.message ??
          "Турнир создан. Подтвердите публикацию в Telegram, если пришёл запрос.",
      );
      setTab("current");
    } finally {
      setCreating(false);
    }
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
          <form
            key={defaultsReady ? "defaults-ready" : "defaults-loading"}
            onSubmit={createTournament}
            className="grid max-w-3xl gap-3 sm:grid-cols-2"
          >
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
              disabled={formatOptionsLoading || formatOptions.length === 0}
            >
              {formatOptionsLoading ? (
                <option value="">Загрузка форматов…</option>
              ) : (
                formatOptions.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
            <DisciplinePicker
              discipline={newDiscipline}
              gameType={newGameType}
              onChange={(d, g) => {
                setNewDiscipline(d);
                setNewGameType(g);
                if (d && g) setDisciplineInvalid(false);
              }}
              required
              invalid={disciplineInvalid}
              className="grid gap-3 sm:col-span-2 sm:grid-cols-2"
            />
            <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={newIsPair}
                onChange={(e) => setNewIsPair(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600"
              />
              <span>
                <span className="font-medium text-zinc-200">Парный турнир</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Регистрация по одному игроку (лимит сетки ×2), пары собирает
                  организатор перетаскиванием на этапе подтверждения.
                </span>
              </span>
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Описание турнира"
              className="site-input w-full resize-y sm:col-span-2"
            />
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Начало турнира</span>
              <input
                name="startsAt"
                type="datetime-local"
                className="site-input w-full max-w-[17rem]"
              />
            </label>
            <div className="sm:col-span-2">
              <TournamentTablePicker
                clubId={clubId}
                selectedIds={selectedTableIds}
                streamUrls={tableStreams}
                onChange={setSelectedTableIds}
                onStreamUrlsChange={setTableStreams}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="handicapHalfStep"
                defaultChecked={tournamentDefaults.handicapHalfStep}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600"
              />
              <span>
                <span className="font-medium text-zinc-200">Учитывать рейтинг 0,5</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Включено: фора по системе 0,5 (например 3,5 vs 0 — 3 шара в каждой партии и +1 в
                  нечётных). Если снять галку — только целая часть разницы (3,5 vs 0 — 3 шара в
                  каждой, без доп. шара в нечётных).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="suppressNotifications"
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-600"
              />
              <span>
                <span className="font-medium text-zinc-200">Без уведомлений по турниру</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Не слать Telegram по этому турниру (запрос на публикацию, рассылка «турнир рядом»,
                  регистрация, встречи). Для тестов — регистрация откроется сразу.
                </span>
              </span>
            </label>
            {tournamentDefaults.limitByRating && (
              <>
                <SearchableSelect
                  label="Источник рейтинга для лимита"
                  options={TOURNAMENT_RATING_SOURCE_OPTIONS}
                  value={ratingSource}
                  onChange={(v) => setRatingSource(v as TournamentRatingSource)}
                  placeholder="Источник рейтинга"
                  searchPlaceholder="Рейтинг…"
                />
                <label className="block text-sm">
                  <span className="mb-1 block text-zinc-400">
                    Максимальный рейтинг участников (0–{MAX_PLAYER_RATING}, шаг {RATING_STEP})
                  </span>
                  <input
                    name="ratingMax"
                    type="number"
                    step={RATING_STEP}
                    min={0}
                    max={MAX_PLAYER_RATING}
                    required
                    defaultValue={tournamentDefaults.ratingMax ?? 8}
                    className="site-input w-full"
                  />
                  <span className="mt-1 block text-xs text-zinc-500">
                    {tournamentRatingSourceHint(ratingSource)} Игроки с рейтингом выше не
                    получат уведомление и не смогут записаться.
                  </span>
                </label>
              </>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={creating || selectedTableIds.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                )}
                {creating ? "Создание…" : "Создать"}
              </button>
              {createMessage && (
                <p
                  className={`text-sm ${
                    /создан|created/i.test(createMessage)
                      ? "text-emerald-400"
                      : "text-red-400"
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
            {tournamentFormatDisplayLabel(t)}
            {t.ratingMax != null && (
              <> · до {formatRating(t.ratingMax)} по рейтингу</>
            )}
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
