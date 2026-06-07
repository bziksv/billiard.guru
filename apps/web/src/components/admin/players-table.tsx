"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import {
  AdminFilterSelect,
  AdminTableSearchField,
  AdminTableToolbar,
  AdminVerifiedFilterChips,
  matchesVerifiedFilter,
  parseVerifiedStatusFilter,
  type VerifiedStatusFilter,
} from "@/components/admin/admin-table-toolbar";
import {
  AdminSortHeader,
  formatAdminDate,
  type SortDir,
} from "@/components/admin/admin-sort-header";
import { CitySelect } from "@/components/admin/city-select";
import { StatusBadge } from "@/components/admin/status-badge";
import { AsyncTextButton } from "@/components/ui/async-text-button";
import { PhoneInput } from "@/components/ui/phone-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatRating } from "@/lib/rating";
import { USER_ROLE_LABELS } from "@/lib/validators";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  cityId: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  telegramUsername: string | null;
  rating: number;
  role: string;
  isVerified: boolean;
  createdAt: string;
  city: { nameRu: string; country: { nameRu: string } };
}

type SortKey =
  | "name"
  | "city"
  | "birthDate"
  | "rating"
  | "phone"
  | "telegram"
  | "status"
  | "createdAt";

const VERIFIED_OPTIONS = [
  { value: "1", label: "Подтверждён" },
  { value: "0", label: "Не подтверждён" },
];

const ROLE_OPTIONS = [
  { value: "PLAYER", label: USER_ROLE_LABELS.PLAYER },
  { value: "SUPERADMIN", label: USER_ROLE_LABELS.SUPERADMIN },
];

function playerName(p: Player) {
  return `${p.lastName} ${p.firstName}${p.middleName ? ` ${p.middleName}` : ""}`;
}

export function PlayersAdminTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerifiedStatusFilter>(() =>
    parseVerifiedStatusFilter(searchParams.get("status")),
  );
  const [cityFilter, setCityFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "city" || key === "phone" ? "asc" : "desc");
    }
  }

  async function reload() {
    const res = await fetch("/api/players");
    const data = await res.json();
    setPlayers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    setStatusFilter(parseVerifiedStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  const setVerifiedFilter = useCallback(
    (value: VerifiedStatusFilter) => {
      setStatusFilter(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("status");
      } else {
        params.set("status", value);
      }
      const query = params.toString();
      router.replace(query ? `/admin/players?${query}` : "/admin/players");
    },
    [router, searchParams],
  );

  const verifiedCounts = useMemo(() => {
    let verified = 0;
    let pending = 0;
    for (const p of players) {
      if (p.isVerified) verified += 1;
      else pending += 1;
    }
    return { all: players.length, verified, pending };
  }, [players]);

  const cityOptions = useMemo(() => {
    const names = new Set(players.map((p) => p.city.nameRu));
    return [...names].sort((a, b) => a.localeCompare(b, "ru"));
  }, [players]);

  const cityFilterOptions = useMemo(
    () => [
      { value: "", label: "Все" },
      ...cityOptions.map((city) => ({ value: city, label: city })),
    ],
    [cityOptions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (!matchesVerifiedFilter(p.isVerified, statusFilter)) return false;
      if (cityFilter && p.city.nameRu !== cityFilter) return false;
      if (!q) return true;
      const haystack = [
        p.lastName,
        p.firstName,
        p.middleName ?? "",
        p.phone,
        p.telegramUsername ?? "",
        p.city.nameRu,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [players, search, statusFilter, cityFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const mul = sortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return mul * playerName(a).localeCompare(playerName(b), "ru");
        case "city":
          return mul * a.city.nameRu.localeCompare(b.city.nameRu, "ru");
        case "birthDate": {
          const ta = a.birthDate ? new Date(a.birthDate).getTime() : null;
          const tb = b.birthDate ? new Date(b.birthDate).getTime() : null;
          if (ta === null && tb === null) return 0;
          if (ta === null) return 1;
          if (tb === null) return -1;
          return mul * (ta - tb);
        }
        case "rating":
          return mul * (a.rating - b.rating);
        case "phone":
          return mul * a.phone.localeCompare(b.phone);
        case "telegram": {
          const ta = a.telegramUsername ?? "";
          const tb = b.telegramUsername ?? "";
          if (!ta && !tb) return 0;
          if (!ta) return 1;
          if (!tb) return -1;
          return mul * ta.localeCompare(tb);
        }
        case "status":
          return mul * (Number(a.isVerified) - Number(b.isVerified));
        case "createdAt":
          return (
            mul *
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        default:
          return 0;
      }
    });

    return list;
  }, [filtered, sortKey, sortDir]);

  async function deletePlayer(player: Player) {
    const name = `${player.lastName} ${player.firstName}`;
    if (
      !confirm(
        `Удалить игрока «${name}»?\n\nТакже удалятся регистрации и команды на турнирах.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Не удалось удалить");
      return;
    }
    if (editingId === player.id) setEditingId(null);
    await reload();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="admin-page-title">Игроки</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SectionLogsButton section="admin_players" context="admin" />
          <Link
            href="/admin/players/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            + Новый игрок
          </Link>
        </div>
      </div>

      <AdminTableToolbar count={{ shown: sorted.length, total: players.length }}>
        <AdminTableSearchField
          value={search}
          onChange={setSearch}
          placeholder="ФИО, телефон, Telegram…"
        />
        <AdminVerifiedFilterChips
          value={statusFilter}
          onChange={setVerifiedFilter}
          counts={verifiedCounts}
        />
        <AdminFilterSelect
          label="Город"
          options={cityFilterOptions}
          value={cityFilter}
          onChange={setCityFilter}
        />
      </AdminTableToolbar>

      {loading ? (
        <p className="admin-muted">Загрузка…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="w-full text-left text-sm">
            <thead className="admin-thead">
              <tr>
                <AdminSortHeader
                  label="ФИО"
                  sortKey="name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Город"
                  sortKey="city"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Д.р."
                  sortKey="birthDate"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Общий рейтинг"
                  sortKey="rating"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Телефон"
                  sortKey="phone"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Telegram"
                  sortKey="telegram"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Регистрация"
                  sortKey="createdAt"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <AdminSortHeader
                  label="Статус"
                  sortKey="status"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((player) => (
                <Fragment key={player.id}>
                  <tr className="admin-table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {player.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.photoUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="admin-avatar-placeholder h-8 w-8">
                            {player.firstName[0]}
                          </div>
                        )}
                        <span className="font-medium">
                          {player.lastName} {player.firstName}
                          {player.middleName ? ` ${player.middleName}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {player.city.nameRu}, {player.city.country.nameRu}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {player.birthDate
                        ? new Date(player.birthDate).toLocaleDateString("ru-RU")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400">
                      {formatRating(player.rating)}
                    </td>
                    <td className="px-4 py-3">{player.phone}</td>
                    <td className="px-4 py-3">
                      {player.telegramUsername ? `@${player.telegramUsername}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatAdminDate(player.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={player.isVerified ? "CONFIRMED" : "PENDING"}
                        label={player.isVerified ? "Подтверждён" : "Не подтверждён"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId(editingId === player.id ? null : player.id)
                          }
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          {editingId === player.id ? "Закрыть" : "Изменить"}
                        </button>
                        <AsyncTextButton
                          variant="red"
                          loadingLabel="…"
                          onClick={() => deletePlayer(player)}
                        >
                          Удалить
                        </AsyncTextButton>
                      </div>
                    </td>
                  </tr>
                  {editingId === player.id && (
                    <tr className="border-t border-zinc-800 bg-zinc-900/50">
                      <td colSpan={9} className="px-4 py-4">
                        <PlayerEditForm
                          player={player}
                          onSaved={() => {
                            setEditingId(null);
                            reload();
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                    {players.length === 0 ? "Игроков пока нет" : "Ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlayerEditForm({
  player,
  onSaved,
  onCancel,
}: {
  player: Player;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [middleName, setMiddleName] = useState(player.middleName ?? "");
  const [cityId, setCityId] = useState(player.cityId);
  const [countryName, setCountryName] = useState(player.city.country.nameRu);
  const [phone, setPhone] = useState(player.phone);
  const [phoneValid, setPhoneValid] = useState(true);
  const [email, setEmail] = useState(player.email ?? "");
  const [birthDate, setBirthDate] = useState(
    player.birthDate ? player.birthDate.slice(0, 10) : "",
  );
  const [rating, setRating] = useState(String(player.rating));
  const [isVerified, setIsVerified] = useState(player.isVerified);
  const [role, setRole] = useState(player.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!phoneValid) {
      setError("Некорректный телефон");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        middleName: middleName || null,
        cityId,
        phone,
        email: email || null,
        birthDate: birthDate || null,
        rating: Number(rating),
        isVerified,
        role,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка сохранения");
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Фамилия" value={lastName} onChange={setLastName} />
        <Field label="Имя" value={firstName} onChange={setFirstName} />
        <Field label="Отчество" value={middleName} onChange={setMiddleName} />
      </div>
      <CitySelect
        value={cityId}
        onChange={setCityId}
        onCountryChange={(c) => setCountryName(c?.nameRu ?? "Россия")}
      />
      <PhoneInput
        countryName={countryName}
        value={phone}
        onChange={(e164, valid) => {
          setPhone(e164);
          setPhoneValid(valid);
        }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field
          label="Дата рождения"
          value={birthDate}
          onChange={setBirthDate}
          type="date"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Общий рейтинг"
          value={rating}
          onChange={setRating}
          type="number"
          step="0.5"
          min="0"
        />
        <SearchableSelect
          label="Статус"
          options={VERIFIED_OPTIONS}
          value={isVerified ? "1" : "0"}
          onChange={(v) => setIsVerified(v === "1")}
          placeholder="Статус"
          searchPlaceholder="Статус…"
        />
        <SearchableSelect
          label="Роль"
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          placeholder="Роль"
          searchPlaceholder="Роль…"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2"
      />
    </label>
  );
}
