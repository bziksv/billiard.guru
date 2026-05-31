"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminFilterSelect,
  AdminTableSearchField,
  AdminTableToolbar,
  VERIFIED_STATUS_FILTER_OPTIONS,
  matchesVerifiedFilter,
  type VerifiedStatusFilter,
} from "@/components/admin/admin-table-toolbar";
import {
  AdminSortHeader,
  formatAdminDate,
  type SortDir,
} from "@/components/admin/admin-sort-header";
import { StatusBadge } from "@/components/admin/status-badge";

interface Club {
  id: string;
  name: string;
  phone: string;
  telegramUsername: string | null;
  isVerified: boolean;
  createdAt: string;
  city: { nameRu: string; country: { nameRu: string } };
}

type SortKey = "name" | "city" | "phone" | "telegram" | "status" | "createdAt";

export function ClubsAdminTable() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerifiedStatusFilter>("all");
  const [cityFilter, setCityFilter] = useState("");
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

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => {
        setClubs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const cityFilterOptions = useMemo(() => {
    const names = [...new Set(clubs.map((c) => c.city.nameRu))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );
    return [{ value: "", label: "Все" }, ...names.map((city) => ({ value: city, label: city }))];
  }, [clubs]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = clubs.filter((c) => {
      if (!matchesVerifiedFilter(c.isVerified, statusFilter)) return false;
      if (cityFilter && c.city.nameRu !== cityFilter) return false;
      if (!q) return true;
      return [c.name, c.phone, c.telegramUsername ?? "", c.city.nameRu]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const mul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return mul * a.name.localeCompare(b.name, "ru");
        case "city":
          return mul * a.city.nameRu.localeCompare(b.city.nameRu, "ru");
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
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        default:
          return 0;
      }
    });
  }, [clubs, search, statusFilter, cityFilter, sortKey, sortDir]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="admin-page-title">Клубы</h1>
        <Link
          href="/admin/clubs/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          + Новый клуб
        </Link>
      </div>

      <AdminTableToolbar count={{ shown: rows.length, total: clubs.length }}>
        <AdminTableSearchField
          value={search}
          onChange={setSearch}
          placeholder="Название, телефон, Telegram…"
        />
        <AdminFilterSelect
          label="Статус"
          options={[...VERIFIED_STATUS_FILTER_OPTIONS]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as VerifiedStatusFilter)}
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
                  label="Название"
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
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((club) => (
                <tr key={club.id} className="admin-table-row">
                  <td className="px-4 py-3 font-medium">{club.name}</td>
                  <td className="px-4 py-3">
                    {club.city.nameRu}, {club.city.country.nameRu}
                  </td>
                  <td className="px-4 py-3">{club.phone}</td>
                  <td className="px-4 py-3">
                    {club.telegramUsername ? `@${club.telegramUsername}` : "—"}
                  </td>
                  <td className="admin-text-secondary px-4 py-3">
                    {formatAdminDate(club.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={club.isVerified ? "CONFIRMED" : "PENDING"}
                      label={club.isVerified ? "Подтверждён" : "Ожидает"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Link
                        href={`/admin/clubs/${club.id}`}
                        className="admin-link text-xs hover:underline"
                      >
                        Профиль
                      </Link>
                      <Link
                        href={`/admin/clubs/${club.id}/ratings`}
                        className="admin-link-muted text-xs hover:underline"
                      >
                        Рейтинг игроков
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-muted px-4 py-8 text-center">
                    {clubs.length === 0 ? "Клубов пока нет" : "Ничего не найдено"}
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
