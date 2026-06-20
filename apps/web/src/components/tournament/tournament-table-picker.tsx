"use client";

import { useEffect, useMemo, useState } from "react";
import { floorTableColor } from "@/lib/club-floor-plan";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import {
  allTournamentTableIds,
  type TournamentTableGroup,
} from "@/lib/tournament-table-pick";

export function TournamentTablePicker({
  clubId,
  selectedIds,
  streamUrls,
  onChange,
  onStreamUrlsChange,
}: {
  clubId: string;
  selectedIds: string[];
  streamUrls: Record<string, string>;
  onChange: (ids: string[]) => void;
  onStreamUrlsChange: (urls: Record<string, string>) => void;
}) {
  const [groups, setGroups] = useState<TournamentTableGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) {
      setGroups([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/clubs/${clubId}/tournament-tables`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить столы");
        if (cancelled) return;
        setGroups(Array.isArray(data.groups) ? data.groups : []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setGroups([]);
        setError(
          fetchError instanceof Error ? fetchError.message : "Не удалось загрузить столы",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const allIds = useMemo(() => allTournamentTableIds(groups), [groups]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));

  function toggleTable(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      if (streamUrls[id]) {
        const next = { ...streamUrls };
        delete next[id];
        onStreamUrlsChange(next);
      }
      return;
    }
    onChange([...selectedIds, id]);
  }

  function setStreamUrl(id: string, value: string) {
    onStreamUrlsChange({ ...streamUrls, [id]: value });
  }

  function toggleGroup(format: ClubTableFormatId) {
    const group = groups.find((entry) => entry.format === format);
    if (!group) return;
    const groupIds = group.tables.map((table) => table.id);
    const everySelected = groupIds.every((id) => selectedSet.has(id));
    if (everySelected) {
      onChange(selectedIds.filter((id) => !groupIds.includes(id)));
      return;
    }
    onChange([...new Set([...selectedIds, ...groupIds])]);
  }

  function toggleAll() {
    if (allSelected) {
      onChange([]);
      return;
    }
    onChange(allIds);
  }

  if (!clubId) {
    return (
      <p className="text-sm text-[var(--admin-text-secondary)]">
        Сначала выберите клуб — покажем доступные столы.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-secondary)]">Загрузка столов…</p>;
  }

  if (error) {
    return <p className="admin-error-panel text-sm">{error}</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="admin-error-panel text-sm">
        В клубе нет столов. Настройте схему зала или укажите количество столов в профиле клуба.
      </p>
    );
  }

  return (
    <div className="tournament-table-picker space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--admin-text)]">Столы под турнир</p>
          <p className="admin-text-secondary mt-1 text-xs">
            Выберите столы и при необходимости укажите ссылку на трансляцию (YouTube, Rutube).
            Без выбора стола создать турнир нельзя.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--admin-text)]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-[var(--admin-border)]"
          />
          <span>Отметить все</span>
        </label>
      </div>

      {selectedIds.length === 0 && (
        <p className="admin-notify-kind--deeplink rounded-lg px-3 py-2 text-sm">
          Выберите хотя бы один стол, чтобы создать турнир.
        </p>
      )}

      {groups.map((group) => {
        const groupIds = group.tables.map((table) => table.id);
        const groupAllSelected =
          groupIds.length > 0 && groupIds.every((id) => selectedSet.has(id));
        const groupSomeSelected =
          !groupAllSelected && groupIds.some((id) => selectedSet.has(id));

        return (
          <section
            key={group.format}
            className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset-bg)] p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: floorTableColor(group.format) }}
                  aria-hidden
                />
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">{group.label}</h3>
                <span className="admin-text-secondary text-xs">
                  {group.tables.length} ст.
                </span>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--admin-text)]">
                <input
                  type="checkbox"
                  checked={groupAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = groupSomeSelected;
                  }}
                  onChange={() => toggleGroup(group.format)}
                  className="h-4 w-4 rounded border-[var(--admin-border)]"
                />
                <span>Отметить все</span>
              </label>
            </div>

            <div className="grid gap-2">
              {group.tables.map((table) => {
                const selected = selectedSet.has(table.id);
                return (
                  <div
                    key={table.id}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel-bg)] px-3 py-2"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--admin-text)]">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTable(table.id)}
                        className="h-4 w-4 shrink-0 rounded border-[var(--admin-border)]"
                      />
                      <span className="min-w-0 truncate font-medium">{table.label}</span>
                    </label>
                    {selected && (
                      <input
                        type="url"
                        value={streamUrls[table.id] ?? ""}
                        onChange={(event) => setStreamUrl(table.id, event.target.value)}
                        placeholder="Ссылка на трансляцию (YouTube, Rutube…)"
                        className="site-input mt-2 w-full text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
