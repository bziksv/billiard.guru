"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminFilterSelect,
  AdminTableSearchField,
  AdminTableToolbar,
} from "@/components/admin/admin-table-toolbar";
import { TournamentListCard } from "@/components/admin/tournament-list-card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/validators";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminTournament } from "@/lib/tournament-admin";
import {
  firstSelectableFormat,
  useBracketFormatOptions,
} from "@/hooks/use-bracket-format-options";
import { FORMAT_OPTIONS } from "@/lib/bracket-formats/catalog";
import { adminTabClass } from "@/lib/admin-ui";
import { MAX_PLAYER_RATING, RATING_STEP } from "@/lib/rating";
import { useTournamentDefaults } from "@/hooks/use-tournament-defaults";
import {
  TOURNAMENT_RATING_SOURCE_OPTIONS,
  tournamentRatingSourceHint,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";

interface Club {
  id: string;
  name: string;
  phone?: string;
  telegramId?: string | null;
  city?: { id: string; nameRu: string; country: { id: string; nameRu: string } };
}

interface UserProfile {
  id: string;
  phone: string;
  telegramId: string | null;
  cityId: string;
  countryId: string;
}

interface GeoCountry {
  id: string;
  nameRu: string;
  cities: { id: string; nameRu: string }[];
}


interface Tournament extends AdminTournament {}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Черновик" },
  { value: "PENDING_CLUB_APPROVAL", label: "Ожидает подтверждения клуба" },
  { value: "OPEN", label: "Открыта регистрация" },
  { value: "ACTIVE", label: "Идёт" },
  { value: "FINISHED", label: "Завершён" },
];

const CURRENT_STATUSES = new Set([
  "DRAFT",
  "PENDING_CLUB_APPROVAL",
  "OPEN",
  "ACTIVE",
]);

function clubOwnedByUser(
  club: Pick<Club, "phone" | "telegramId">,
  user: UserProfile | null,
): boolean {
  if (!user) return true;
  if (user.telegramId && club.telegramId === user.telegramId) return true;
  if (club.phone === user.phone) return true;
  return false;
}

function matchesGeoFilters(
  tournament: Tournament,
  countryId: string,
  cityId: string,
): boolean {
  const city = tournament.club.city;
  if (countryId && city?.country.id !== countryId) return false;
  if (cityId && city?.id !== cityId) return false;
  return true;
}

function matchesSearch(tournament: Tournament, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [tournament.name, tournament.description ?? "", tournament.club.name]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export default function TournamentsPage() {
  const router = useRouter();
  const { defaults: tournamentDefaults, ready: defaultsReady } =
    useTournamentDefaults();
  const { options: formatOptions, loading: formatOptionsLoading } =
    useBracketFormatOptions();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [newClubId, setNewClubId] = useState("");
  const [newFormat, setNewFormat] = useState("OLYMPIC");
  const [ratingSource, setRatingSource] = useState<TournamentRatingSource>("CLUB");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [geoCountries, setGeoCountries] = useState<GeoCountry[]>([]);
  const [listSearch, setListSearch] = useState("");
  const [listCountryId, setListCountryId] = useState("");
  const [listCityId, setListCityId] = useState("");
  const [myClubsOnly, setMyClubsOnly] = useState(true);
  const [listStatus, setListStatus] = useState("");
  const [listFormat, setListFormat] = useState("");
  const [finishedSearch, setFinishedSearch] = useState("");
  const [filtersReady, setFiltersReady] = useState(false);
  const [tab, setTab] = useState<"create" | "current" | "finished">("current");

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

  async function reloadTournaments() {
    const t = await fetch("/api/tournaments").then((r) => r.json());
    setTournaments(t);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/tournaments").then((r) => r.json()),
      fetch("/api/clubs").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/geo").then((r) => r.json()),
    ]).then(([t, c, me, geo]) => {
      setTournaments(Array.isArray(t) ? t : []);
      setClubs(Array.isArray(c) ? c : []);
      setGeoCountries(Array.isArray(geo) ? geo : []);

      const user = me?.user as UserProfile | undefined;
      if (user) {
        setUserProfile(user);
        setListCountryId(user.countryId);
        setListCityId(user.cityId);
      }
      setFiltersReady(true);
    });
  }, []);

  const myClubs = useMemo(
    () => clubs.filter((c) => clubOwnedByUser(c, userProfile)),
    [clubs, userProfile],
  );

  const clubOptions = useMemo(
    () => myClubs.map((c) => ({ value: c.id, label: c.name })),
    [myClubs],
  );

  const allClubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.id, label: c.name })),
    [clubs],
  );

  useEffect(() => {
    if (!filtersReady || newClubId) return;
    if (myClubs.length === 1) {
      setNewClubId(myClubs[0].id);
    }
  }, [filtersReady, myClubs, newClubId]);

  const currentStatusFilterOptions = useMemo(
    () => [
      { value: "", label: "Все" },
      ...STATUS_OPTIONS.filter((o) => CURRENT_STATUSES.has(o.value)),
    ],
    [],
  );

  const countryFilterOptions = useMemo(
    () => [
      { value: "", label: "Все страны" },
      ...geoCountries.map((c) => ({ value: c.id, label: c.nameRu })),
    ],
    [geoCountries],
  );

  const cityFilterOptions = useMemo(() => {
    const cities =
      geoCountries.find((c) => c.id === listCountryId)?.cities ?? [];
    return [
      { value: "", label: "Все города" },
      ...cities.map((city) => ({ value: city.id, label: city.nameRu })),
    ];
  }, [geoCountries, listCountryId]);

  const currentTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (!CURRENT_STATUSES.has(t.status)) return false;
      if (myClubsOnly && userProfile && !clubOwnedByUser(t.club, userProfile)) {
        return false;
      }
      if (!matchesGeoFilters(t, listCountryId, listCityId)) return false;
      if (listStatus && t.status !== listStatus) return false;
      if (listFormat && t.format !== listFormat) return false;
      return matchesSearch(t, listSearch);
    });
  }, [
    tournaments,
    myClubsOnly,
    userProfile,
    listCountryId,
    listCityId,
    listStatus,
    listFormat,
    listSearch,
  ]);

  const finishedTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (t.status !== "FINISHED") return false;
      if (myClubsOnly && userProfile && !clubOwnedByUser(t.club, userProfile)) {
        return false;
      }
      if (!matchesGeoFilters(t, listCountryId, listCityId)) return false;
      return matchesSearch(t, finishedSearch);
    });
  }, [
    tournaments,
    myClubsOnly,
    userProfile,
    listCountryId,
    listCityId,
    finishedSearch,
  ]);

  const currentTotal = useMemo(
    () =>
      tournaments.filter(
        (t) =>
          CURRENT_STATUSES.has(t.status) &&
          (!myClubsOnly || !userProfile || clubOwnedByUser(t.club, userProfile)),
      ).length,
    [tournaments, myClubsOnly, userProfile],
  );

  const finishedTotal = useMemo(
    () =>
      tournaments.filter(
        (t) =>
          t.status === "FINISHED" &&
          (!myClubsOnly || !userProfile || clubOwnedByUser(t.club, userProfile)),
      ).length,
    [tournaments, myClubsOnly, userProfile],
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
        clubId: newClubId,
        format: newFormat,
        startsAt: form.get("startsAt") || undefined,
        ratingMax: tournamentDefaults.limitByRating
          ? Number(form.get("ratingMax"))
          : null,
        ratingSource: tournamentDefaults.limitByRating ? ratingSource : "CLUB",
        handicapHalfStep: form.get("handicapHalfStep") === "on",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateMessage(data.error ?? "Ошибка создания");
      return;
    }
    await reloadTournaments();
    setNewClubId("");
    setNewFormat("OLYMPIC");
    formEl.reset();
    setCreateMessage(
      data.message ??
        "Турнир создан. Владельцу клуба отправлен запрос в Telegram.",
    );
    setTab("current");
  }

  async function startTournament(id: string) {
    setStartingId(id);
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    const data = await res.json();
    setStartingId(null);
    if (!res.ok) {
      alert(data.error ?? "Не удалось начать турнир");
      return;
    }
    router.push(`/admin/tournaments/${id}`);
  }

  async function deleteTournament(id: string, name: string) {
    if (
      !confirm(
        `Удалить турнир «${name}»?\n\nРегистрации, команды и матчи будут удалены без возможности восстановления.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Не удалось удалить турнир");
      return;
    }
    await reloadTournaments();
  }

  return (
    <div className="space-y-6">
      <h1 className="admin-page-title">Турниры</h1>

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
          Текущие{currentTotal > 0 ? ` (${currentTotal})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("finished")}
          className={adminTabClass(tab === "finished")}
        >
          Завершённые{finishedTotal > 0 ? ` (${finishedTotal})` : ""}
        </button>
      </div>

      {tab === "create" && (
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-1 text-lg font-semibold">Создать турнир</h2>
        <p className="mb-5 text-sm text-zinc-500">
          После создания владельцу клуба в Telegram уйдёт запрос на публикацию.
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
            className="sm:col-span-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <SearchableSelect
            options={clubOptions.length > 0 ? clubOptions : allClubOptions}
            value={newClubId}
            onChange={setNewClubId}
            placeholder="Клуб-организатор"
            searchPlaceholder="Поиск клуба…"
            required
          />
          <SearchableSelect
            options={
              formatOptionsLoading
                ? [{ value: newFormat, label: "Загрузка форматов…" }]
                : formatOptions
            }
            value={newFormat}
            onChange={setNewFormat}
            placeholder="Формат турнира"
            searchPlaceholder="Поиск формата…"
            required
            disabled={formatOptionsLoading || formatOptions.length === 0}
          />
          <textarea
            name="description"
            rows={4}
            placeholder="Описание турнира (формат игры, призовой фонд, правила…)"
            className="sm:col-span-2 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <input
            name="startsAt"
            type="datetime-local"
            className="sm:col-span-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="handicapHalfStep"
              defaultChecked={tournamentDefaults.handicapHalfStep}
              className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
            />
            <span>
              <span className="font-medium text-zinc-200">Учитывать рейтинг 0,5</span>
              <span className="mt-1 block text-xs text-zinc-500">
                С галкой — фора по шагу 0,5. Без галки — только целые шары по разнице рейтингов, без
                дополнительного шара в нечётных партиях.
              </span>
            </span>
          </label>
          {tournamentDefaults.limitByRating && (
            <>
              <div className="sm:col-span-2">
                <SearchableSelect
                  label="Источник рейтинга для лимита"
                  options={TOURNAMENT_RATING_SOURCE_OPTIONS}
                  value={ratingSource}
                  onChange={(v) => setRatingSource(v as TournamentRatingSource)}
                  placeholder="Источник рейтинга"
                  searchPlaceholder="Рейтинг…"
                />
              </div>
              <label className="sm:col-span-2 block text-sm">
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-xs text-zinc-500">
                  {tournamentRatingSourceHint(ratingSource)} Выше лимита — без уведомления и без
                  записи.
                </span>
              </label>
            </>
          )}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500"
            >
              Создать
            </button>
            {createMessage && (
              <p
                className={`text-sm ${createMessage.includes("ошиб") || createMessage.includes("Ошиб") ? "text-red-400" : "text-emerald-400"}`}
              >
                {createMessage}
              </p>
            )}
          </div>
        </form>
      </section>
      )}

      {tab === "current" && (
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Текущие турниры</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Черновики, ожидающие публикации, открытая регистрация и идущие
              турниры ваших клубов.
            </p>
          </div>
        </div>

        <AdminTableToolbar
          count={{ shown: currentTournaments.length, total: currentTotal }}
        >
          <AdminTableSearchField
            value={listSearch}
            onChange={setListSearch}
            placeholder="Название, клуб, описание…"
          />
          <AdminFilterSelect
            label="Страна"
            options={countryFilterOptions}
            value={listCountryId}
            onChange={(id) => {
              setListCountryId(id);
              setListCityId("");
            }}
          />
          <AdminFilterSelect
            label="Город"
            options={cityFilterOptions}
            value={listCityId}
            onChange={setListCityId}
            placeholder={listCountryId ? "Все города" : "Сначала страна"}
          />
          <AdminFilterSelect
            label="Статус"
            options={currentStatusFilterOptions}
            value={listStatus}
            onChange={setListStatus}
          />
          <AdminFilterSelect
            label="Формат"
            options={[{ value: "", label: "Все" }, ...FORMAT_OPTIONS]}
            value={listFormat}
            onChange={setListFormat}
          />
          <label className="flex min-w-[160px] items-end gap-2 pb-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={myClubsOnly}
              onChange={(e) => setMyClubsOnly(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Только мои клубы
          </label>
        </AdminTableToolbar>

        <div className="space-y-3">
          {currentTournaments.map((t) => (
            <TournamentListCard
              key={t.id}
              tournament={t}
              starting={startingId === t.id}
              onStart={startTournament}
            />
          ))}
          {currentTournaments.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">
              {currentTotal === 0
                ? "Текущих турниров пока нет"
                : "Ничего не найдено по фильтрам"}
            </p>
          )}
        </div>
      </section>
      )}

      {tab === "finished" && (
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Завершённые турниры</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Архив прошедших турниров ваших клубов.
          </p>
        </div>

        <AdminTableToolbar
          count={{ shown: finishedTournaments.length, total: finishedTotal }}
        >
          <AdminTableSearchField
            value={finishedSearch}
            onChange={setFinishedSearch}
            placeholder="Название, клуб…"
          />
          <AdminFilterSelect
            label="Страна"
            options={countryFilterOptions}
            value={listCountryId}
            onChange={(id) => {
              setListCountryId(id);
              setListCityId("");
            }}
          />
          <AdminFilterSelect
            label="Город"
            options={cityFilterOptions}
            value={listCityId}
            onChange={setListCityId}
            placeholder={listCountryId ? "Все города" : "Сначала страна"}
          />
          <label className="flex min-w-[160px] items-end gap-2 pb-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={myClubsOnly}
              onChange={(e) => setMyClubsOnly(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Только мои клубы
          </label>
        </AdminTableToolbar>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Турнир</th>
                <th className="px-4 py-3 font-medium">Клуб</th>
                <th className="px-4 py-3 font-medium">Город</th>
                <th className="px-4 py-3 font-medium">Формат</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {finishedTournaments.map((t) => (
                <FinishedTournamentRow
                  key={t.id}
                  tournament={t}
                  onDelete={() => deleteTournament(t.id, t.name)}
                />
              ))}
            </tbody>
          </table>
          {finishedTournaments.length === 0 && (
            <p className="py-10 text-center text-sm text-zinc-500">
              {finishedTotal === 0
                ? "Завершённых турниров пока нет"
                : "Ничего не найдено по фильтрам"}
            </p>
          )}
        </div>
      </section>
      )}
    </div>
  );
}

function FinishedTournamentRow({
  tournament: t,
  onDelete,
}: {
  tournament: Tournament;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <tr className="border-b border-zinc-800/80 last:border-0 hover:bg-zinc-950/50">
      <td className="px-4 py-3 font-medium">
        <Link
          href={`/admin/tournaments/${t.id}`}
          className="hover:text-emerald-400 hover:underline"
        >
          {t.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-zinc-300">{t.club.name}</td>
      <td className="px-4 py-3 text-zinc-400">
        {t.club.city?.nameRu ?? "—"}
      </td>
      <td className="px-4 py-3 text-zinc-400">
        {TOURNAMENT_FORMAT_LABELS[t.format] ?? t.format}
      </td>
      <td className="px-4 py-3 text-zinc-400">
        {t.startsAt ? formatAdminDate(t.startsAt) : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/tournaments/${t.id}`}
            className="text-xs text-emerald-400 hover:underline"
          >
            Открыть
          </Link>
          <Link
            href={`/tournaments/${t.id}`}
            className="text-xs text-zinc-400 hover:underline"
          >
            На сайте
          </Link>
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onDelete();
              } finally {
                setDeleting(false);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {deleting ? "…" : "Удалить"}
          </button>
        </div>
      </td>
    </tr>
  );
}
