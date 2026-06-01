"use client";

import { useCallback, useEffect, useState } from "react";
import { ClubFloorPlanCanvas } from "@/components/club/club-floor-plan-canvas";
import {
  FLOOR_AMENITIES,
  createFloorPlanItem,
  floorTableAssignedTierLabels,
  floorTableDisplayPrice,
  floorTableUsesAllHourlyTiers,
  mergeAutoTables,
  normalizeTableTierLabels,
  parseFloorPlan,
  type ClubFloorPlan,
  type FloorAmenityKind,
  type FloorPlanItem,
} from "@/lib/club-floor-plan";
import {
  isTimedPriceTier,
  parsePriceTiers,
  priceTierDaysLabel,
  type PriceTier,
} from "@/lib/club-schedule";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import {
  clubTableCountsEntries,
  clubTableCountsTotal,
  clubTableFormatLabel,
  parseClubTableCounts,
  type ClubTableFormatId,
} from "@/lib/club-table-formats";

export function ClubFloorPlanEditor({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName?: string;
}) {
  const [items, setItems] = useState<FloorPlanItem[]>([]);
  const [tableCounts, setTableCounts] = useState<ReturnType<typeof parseClubTableCounts>>({});
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("Курилка");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<FloorAmenityKind | "table" | null>(null);
  const [pendingTableFormat, setPendingTableFormat] = useState<ClubTableFormatId | "">("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/clubs/${clubId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Клуб не найден");
      setLoading(false);
      return;
    }
    const plan = parseFloorPlan(data.floorPlan);
    setItems(plan?.items ?? []);
    setTableCounts(parseClubTableCounts(data.tableCounts));
    setPriceTiers(parsePriceTiers(data.priceTiers));
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateItem(id: string, patch: Partial<FloorPlanItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeSelected() {
    if (!selectedId) return;
    setItems((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }

  function addAmenity(kind: FloorAmenityKind) {
    setPendingKind(kind);
    setPendingTableFormat("");
    setMessage(null);
  }

  function addTable(format: ClubTableFormatId) {
    setPendingKind("table");
    setPendingTableFormat(format);
    setMessage(null);
  }

  function placeAt(x: number, y: number) {
    if (!pendingKind) return;
    if (pendingKind === "table" && pendingTableFormat) {
      const sameFormat = items.filter(
        (item) => item.kind === "table" && item.tableFormat === pendingTableFormat,
      );
      setItems((prev) => [
        ...prev,
        createFloorPlanItem("table", x, y, {
          tableFormat: pendingTableFormat,
          tableIndex: sameFormat.length + 1,
        }),
      ]);
    } else if (pendingKind !== "table") {
      setItems((prev) => [
        ...prev,
        createFloorPlanItem(pendingKind, x, y, {
          label: pendingKind === "custom" ? customLabel : undefined,
        }),
      ]);
    }
    setPendingKind(null);
    setPendingTableFormat("");
  }

  function autoLayout() {
    setItems(mergeAutoTables(items, tableCounts));
    setMessage("Столы расставлены по сетке — перетащите как нужно");
  }

  function toggleTableTier(tableId: string, tierLabel: string) {
    const item = items.find((i) => i.id === tableId);
    if (!item || item.kind !== "table") return;

    const hourlyLabels = priceTiers.filter(isTimedPriceTier).map((t) => t.label);
    const usesAll = floorTableUsesAllHourlyTiers(item);
    let current = usesAll ? [...hourlyLabels] : [...(floorTableAssignedTierLabels(item) ?? [])];

    if (current.includes(tierLabel)) {
      current = current.filter((l) => l !== tierLabel);
    } else {
      current.push(tierLabel);
    }

    const sortedCurrent = [...current].sort();
    const sortedHourly = [...hourlyLabels].sort();
    const isAllHourly =
      sortedCurrent.length === sortedHourly.length &&
      sortedCurrent.every((l, i) => l === sortedHourly[i]);

    if (current.length === 0 || isAllHourly) {
      updateItem(tableId, { priceTierLabels: undefined, priceTierLabel: undefined });
    } else {
      updateItem(tableId, { priceTierLabels: current, priceTierLabel: undefined });
    }
  }

  function resetTableTiers(tableId: string) {
    updateItem(tableId, { priceTierLabels: undefined, priceTierLabel: undefined });
  }

  function isTableTierChecked(item: FloorPlanItem, tierLabel: string): boolean {
    if (floorTableUsesAllHourlyTiers(item)) {
      const tier = priceTiers.find((t) => t.label === tierLabel);
      return tier ? isTimedPriceTier(tier) : false;
    }
    return floorTableAssignedTierLabels(item)?.includes(tierLabel) ?? false;
  }

  function tierTimeHint(tier: PriceTier): string {
    const parts: string[] = [priceTierDaysLabel(tier.days)];
    if (tier.timeFrom && tier.timeTo) parts.push(`${tier.timeFrom}–${tier.timeTo}`);
    return parts.join(" · ");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const normalizedItems = items.map((item) =>
      item.kind === "table" ? { ...item, ...normalizeTableTierLabels(item) } : item,
    );
    const payload: ClubFloorPlan | null =
      normalizedItems.length > 0 ? { version: 1, items: normalizedItems } : null;
    const res = await fetch(`/api/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorPlan: payload }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось сохранить");
      return;
    }
    const plan = parseFloorPlan(data.floorPlan);
    setItems(plan?.items ?? []);
    setMessage("План зала сохранён");
  }

  const tableEntries = clubTableCountsEntries(tableCounts);
  const tablesTotal = clubTableCountsTotal(tableCounts);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;

  return (
    <div className="club-floor-plan-editor space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">План зала</h1>
          {clubName && <p className="mt-1 text-sm text-zinc-500">{clubName}</p>}
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Расставьте столы и отметьте зоны клуба — вход, бар, туалет и другое. Перетаскивайте
            элементы мышью. На сайте план покажется посетителям.
          </p>
        </div>
        <SectionLogsButton section="floor" clubId={clubId} />
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          {pendingKind && (
            <p className="rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
              Кликните на схему, чтобы поставить элемент
            </p>
          )}
          <ClubFloorPlanCanvas
            items={items}
            editable
            selectedId={selectedId}
            priceTiers={priceTiers}
            priceAt={new Date()}
            onSelect={setSelectedId}
            onMove={(id, x, y) => updateItem(id, { x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) })}
            onPlace={pendingKind ? placeAt : undefined}
          />

          {selected && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  {selected.kind === "table" ? (
                    <>
                      <p className="text-xs text-zinc-500">
                        {clubTableFormatLabel(selected.tableFormat!)}
                        {selected.tableIndex ? ` · № ${selected.tableIndex}` : ""}
                      </p>
                      <label className="block">
                        <span className="text-xs text-zinc-500">Название стола</span>
                        <input
                          value={selected.label ?? ""}
                          onChange={(e) =>
                            updateItem(selected.id, { label: e.target.value.slice(0, 40) })
                          }
                          placeholder="Например: VIP, У окна"
                          className="site-input mt-1 w-full py-1.5 text-sm"
                        />
                        <span className="mt-1 block text-xs text-zinc-600">
                          Пусто — автоматически «{clubTableFormatLabel(selected.tableFormat!)}{" "}
                          {selected.tableIndex ?? ""}»
                        </span>
                      </label>
                      <div className="block">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-zinc-500">Тарифы</span>
                          {!floorTableUsesAllHourlyTiers(selected) && (
                            <button
                              type="button"
                              onClick={() => resetTableTiers(selected.id)}
                              className="text-xs text-emerald-400 hover:underline"
                            >
                              Все почасовые
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">
                          {floorTableUsesAllHourlyTiers(selected)
                            ? "По умолчанию — все почасовые тарифы клуба по расписанию (день, вечер, выходные…)."
                            : "Выбраны только отмеченные тарифы — цена на схеме меняется по времени суток."}
                        </p>
                        {priceTiers.length === 0 ? (
                          <span className="mt-2 block text-xs text-zinc-600">
                            Тарифы задаются в разделе «Тарифы клуба».
                          </span>
                        ) : (
                          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-800 p-2">
                            {priceTiers.map((tier) => (
                              <li key={tier.label}>
                                <label className="flex cursor-pointer items-start gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={isTableTierChecked(selected, tier.label)}
                                    onChange={() => toggleTableTier(selected.id, tier.label)}
                                    className="mt-0.5"
                                  />
                                  <span>
                                    <span className="font-medium text-zinc-200">{tier.label}</span>
                                    <span className="text-zinc-500"> — {tier.price}</span>
                                    <span className="mt-0.5 block text-zinc-600">
                                      {tierTimeHint(tier)}
                                    </span>
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                        {priceTiers.length > 0 && (
                          <p className="mt-2 text-xs text-emerald-400/90">
                            Сейчас на схеме:{" "}
                            {floorTableDisplayPrice(selected, priceTiers) ?? "—"}
                          </p>
                        )}
                      </div>
                    </>
                  ) : selected.kind === "custom" ? (
                    <label className="block">
                      <span className="text-xs text-zinc-500">Подпись</span>
                      <input
                        value={selected.label ?? ""}
                        onChange={(e) => updateItem(selected.id, { label: e.target.value })}
                        className="site-input mt-1 w-full py-1.5 text-sm"
                        placeholder="Подпись"
                      />
                    </label>
                  ) : (
                    <p className="text-zinc-400">
                      {FLOOR_AMENITIES.find((a) => a.kind === selected.kind)?.label ?? "Зона"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeSelected}
                  className="shrink-0 text-red-400 hover:text-red-300"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 space-y-4 xl:w-72">
          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-sm font-semibold">Зоны клуба</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {FLOOR_AMENITIES.map((amenity) => (
                <button
                  key={amenity.kind}
                  type="button"
                  onClick={() => addAmenity(amenity.kind)}
                  className={cnPaletteButton(pendingKind === amenity.kind)}
                >
                  <span>{amenity.icon}</span>
                  <span>{amenity.label}</span>
                </button>
              ))}
            </div>
            {pendingKind === "custom" && (
              <label className="mt-3 block text-xs text-zinc-500">
                Текст подписи
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="site-input mt-1 w-full text-sm"
                />
              </label>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-sm font-semibold">Столы</h2>
            {tableEntries.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                Сначала укажите количество столов в профиле клуба.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-zinc-500">
                  В профиле: {tablesTotal} {tablesTotal === 1 ? "стол" : "столов"}
                </p>
                <div className="mt-3 space-y-2">
                  {tableEntries.map(({ id, label, count }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => addTable(id)}
                      className={cnPaletteButton(
                        pendingKind === "table" && pendingTableFormat === id,
                      )}
                    >
                      <span>{label}</span>
                      <span className="text-zinc-500">· {count}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={autoLayout}
                  className="mt-3 w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-emerald-600"
                >
                  Расставить все столы автоматически
                </button>
              </>
            )}
          </section>

          <div className="sticky top-6 space-y-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            {message && <p className="text-sm text-emerald-400">{message}</p>}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить план"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function cnPaletteButton(active: boolean) {
  return [
    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
    active
      ? "border-emerald-600 bg-emerald-950/50 text-emerald-200"
      : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600",
  ].join(" ");
}
