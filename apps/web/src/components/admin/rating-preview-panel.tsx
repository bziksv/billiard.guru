"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminFilterSelect,
  AdminTableSearchField,
  AdminTableToolbar,
} from "@/components/admin/admin-table-toolbar";
import { AdminSortHeader, type SortDir } from "@/components/admin/admin-sort-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TournamentRatingSourceSelect } from "@/components/tournament/tournament-rating-source-select";
import {
  DEFAULT_MIN_H2H_MATCHES,
  DEFAULT_MIN_TOURNAMENTS,
  formatPreviewDelta,
  formatPreviewRating,
  type RatingPreviewBundle,
  type RatingPreviewFormula,
  type RatingPreviewH2hRow,
  type RatingPreviewPlayerRow,
  type RatingPreviewResult,
} from "@/lib/rating-preview";
import {
  FALLBACK_RATING_AUTO_CONFIG,
  RATING_PREVIEW_FORMULA_OPTIONS,
  type RatingAutoConfig,
} from "@/lib/rating-auto-config";
import type { TournamentRatingSource } from "@/lib/tournament-rating-display";

type ClubOption = { id: string; name: string };

type RatingSnapshotItem = {
  id: string;
  label: string | null;
  formula: string | null;
  playerCount: number;
  matchCount: number | null;
  createdAt: string;
};

type SortKey =
  | "name"
  | "currentRating"
  | "proposedRating"
  | "delta"
  | "tournaments"
  | "matchesSimulated"
  | "wins"
  | "losses"
  | "winRate";

function previewForFormula(
  bundle: RatingPreviewBundle,
  formula: RatingPreviewFormula,
): RatingPreviewResult {
  switch (formula) {
    case "upset_only":
      return bundle.upsetOnly;
    case "upset_mild":
      return bundle.upsetMild;
    case "mild_all":
      return bundle.mildAll;
    case "tiny_equal":
      return bundle.tinyEqual;
    case "elo":
      return bundle.elo;
    case "micro_equal":
      return bundle.microEqual;
    default:
      return bundle.soft;
  }
}

export function RatingPreviewPanel() {
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [clubId, setClubId] = useState("");
  const [ratingSource, setRatingSource] = useState<TournamentRatingSource>("SYSTEM");
  const [minTournaments, setMinTournaments] = useState(String(DEFAULT_MIN_TOURNAMENTS));
  const [minH2hMatches, setMinH2hMatches] = useState(String(DEFAULT_MIN_H2H_MATCHES));
  const [formula, setFormula] = useState<RatingPreviewFormula>(
    FALLBACK_RATING_AUTO_CONFIG.formula,
  );
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<RatingPreviewBundle | null>(null);
  const [snapshots, setSnapshots] = useState<RatingSnapshotItem[]>([]);
  const [recalcStatus, setRecalcStatus] = useState<"idle" | "running" | "error">("idle");
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ClubOption[]) => {
        const list = Array.isArray(data) ? data : [];
        setClubs(list.map((c) => ({ id: c.id, name: c.name })));
        if (list.length === 1) setClubId(list[0].id);
      })
      .catch(() => setClubs([]));
  }, []);

  useEffect(() => {
    fetch("/api/admin/rating-auto-config")
      .then((r) => (r.ok ? r.json() : FALLBACK_RATING_AUTO_CONFIG))
      .then((data: RatingAutoConfig) => {
        setAutoEnabled(Boolean(data.enabled));
        setFormula(data.formula ?? FALLBACK_RATING_AUTO_CONFIG.formula);
        setMinTournaments(String(data.minTournaments ?? DEFAULT_MIN_TOURNAMENTS));
        setMinH2hMatches(String(data.minH2hMatches ?? DEFAULT_MIN_H2H_MATCHES));
      })
      .catch(() => undefined)
      .finally(() => setConfigLoaded(true));
  }, []);

  useEffect(() => {
    fetch("/api/admin/rating-recalc")
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then((data: { snapshots?: RatingSnapshotItem[] }) => {
        setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []);
      })
      .catch(() => setSnapshots([]));
  }, []);

  const clubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.id, label: c.name })),
    [clubs],
  );

  async function saveAutoConfig() {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/rating-auto-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoEnabled,
          formula,
          minTournaments: parseInt(minTournaments, 10) || DEFAULT_MIN_TOURNAMENTS,
          minH2hMatches: parseInt(minH2hMatches, 10) || DEFAULT_MIN_H2H_MATCHES,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        setSaveError(data.error ?? "Не удалось сохранить");
        return;
      }
      setAutoEnabled(Boolean(data.enabled));
      setFormula(data.formula);
      setMinTournaments(String(data.minTournaments));
      setMinH2hMatches(String(data.minH2hMatches));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setSaveError("Не удалось сохранить");
    }
  }

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rating-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratingSource,
          clubId: ratingSource === "CLUB" ? clubId || null : null,
          minTournaments: parseInt(minTournaments, 10) || DEFAULT_MIN_TOURNAMENTS,
          minH2hMatches: parseInt(minH2hMatches, 10) || DEFAULT_MIN_H2H_MATCHES,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка превью");
        setBundle(null);
        return;
      }
      setBundle(data as RatingPreviewBundle);
    } catch {
      setError("Не удалось построить превью");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }

  async function runBulkRecalc() {
    const opt =
      RATING_PREVIEW_FORMULA_OPTIONS.find((o) => o.value === formula)?.short ??
      formula;
    const ok = window.confirm(
      `Пересчитать общий рейтинг формулой «${opt}» по всем завершённым встречам?\n\n` +
        "Старт — «База рейтинга» (ratingBase) у каждого игрока, не текущий rating.\n" +
        "Повторный прогон с той же базой даст тот же результат.\n" +
        "Перед записью — снимок текущего rating (откат кнопкой «Вернуть»).\n" +
        "Клубный рейтинг не меняется.",
    );
    if (!ok) return;

    setRecalcStatus("running");
    setRecalcMessage(null);
    try {
      const res = await fetch("/api/admin/rating-recalc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RECALC", formula }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecalcStatus("error");
        setRecalcMessage(data.error ?? "Ошибка прогона");
        return;
      }
      if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
      setRecalcStatus("idle");
      setRecalcMessage(
        `Готово: ${data.matchCount} встреч, изменено игроков ${data.playersTouched}. Снимок сохранён.`,
      );
    } catch {
      setRecalcStatus("error");
      setRecalcMessage("Не удалось выполнить прогон");
    }
  }

  async function restoreSnapshot(id: string) {
    const ok = window.confirm(
      "Вернуть общий рейтинг из этого снимка?\n\n" +
        "Текущие значения Player.rating будут заменены. Журнал изменений по матчам очистится — можно снова запустить прогон.",
    );
    if (!ok) return;

    setRestoreBusyId(id);
    setRecalcMessage(null);
    try {
      const res = await fetch(`/api/admin/rating-snapshots/${id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESTORE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecalcStatus("error");
        setRecalcMessage(data.error ?? "Ошибка восстановления");
        return;
      }
      if (Array.isArray(data.snapshots)) setSnapshots(data.snapshots);
      setRecalcStatus("idle");
      setRecalcMessage(`Восстановлено игроков: ${data.playerCount}`);
    } catch {
      setRecalcStatus("error");
      setRecalcMessage("Не удалось восстановить снимок");
    } finally {
      setRestoreBusyId(null);
    }
  }

  const selectedOption =
    RATING_PREVIEW_FORMULA_OPTIONS.find((o) => o.value === formula) ??
    RATING_PREVIEW_FORMULA_OPTIONS[4]!;

  function formatSnapshotWhen(iso: string): string {
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <section className="admin-card space-y-5 p-6">
      <div>
        <h2 className="mb-1 text-base font-semibold">Авторейтинг (общий)</h2>
        <p className="admin-muted text-xs leading-relaxed">
          Выберите формулу для <strong>Player.rating</strong> (общий рейтинг). После
          сохранения с галочкой «Включить» рейтинг считается сразу при фиксации результата
          встречи в турнире и откатывается при отмене результата. Мин. турниров / H2H
          сохраняются вместе с формулой (для превью и пула сравнения).
        </p>
      </div>

      <div className="admin-inset space-y-4 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoEnabled}
            disabled={!configLoaded}
            onChange={(e) => setAutoEnabled(e.target.checked)}
          />
          <span>
            <span className="font-medium">Включить автопересчёт общего рейтинга</span>
            <span className="admin-muted mt-0.5 block text-xs">
              {autoEnabled
                ? "Активно после сохранения: каждый завершённый матч двигает общий рейтинг."
                : "Выключено: результаты матчей рейтинг не меняют, пока не сохраните с галочкой."}
            </span>
          </span>
        </label>

        <fieldset className="space-y-2">
          <legend className="admin-label mb-1">Формула</legend>
          {RATING_PREVIEW_FORMULA_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                type="radio"
                name="rating-formula"
                className="mt-1"
                checked={formula === opt.value}
                onChange={() => setFormula(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label">Мин. турниров (превью)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={minTournaments}
              onChange={(e) => setMinTournaments(e.target.value)}
              className="admin-input w-full px-3 py-2"
            />
          </div>
          <div>
            <label className="admin-label">Мин. встреч для H2H</label>
            <input
              type="number"
              min={2}
              max={100}
              value={minH2hMatches}
              onChange={(e) => setMinH2hMatches(e.target.value)}
              className="admin-input w-full px-3 py-2"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAutoConfig}
            disabled={!configLoaded || saveStatus === "saving"}
            className="admin-btn admin-btn--primary px-5 py-2 text-sm"
          >
            {saveStatus === "saving" ? "Сохраняем…" : "Сохранить формулу и настройки"}
          </button>
          {saveStatus === "saved" && (
            <span className="text-sm text-[var(--admin-notify-outbound-text)]">Сохранено</span>
          )}
          {saveStatus === "error" && saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
          {configLoaded && (
            <span className="admin-muted text-xs">
              Сейчас: {autoEnabled ? "включено" : "выключено"} · {selectedOption.short}
            </span>
          )}
        </div>
      </div>

      <div className="admin-inset space-y-4 p-4">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--admin-text)]">
            Прогон по всем встречам
          </h3>
          <p className="admin-muted text-xs leading-relaxed">
            Пересчёт от поля «База рейтинга» у игроков: по всем завершённым встречам
            накатывается формула. База не обнуляется и не меняется прогоном. Снимок
            текущего rating — для отката эксперимента. Автопересчёт новых матчей —
            отдельная галочка выше.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runBulkRecalc}
            disabled={!configLoaded || recalcStatus === "running" || restoreBusyId != null}
            className="admin-btn admin-btn--primary px-5 py-2 text-sm"
          >
            {recalcStatus === "running" && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {recalcStatus === "running"
              ? "Прогоняем…"
              : `Прогнать все встречи (${selectedOption.short})`}
          </button>
          {recalcMessage && (
            <span
              className={`text-sm ${
                recalcStatus === "error"
                  ? "text-red-600"
                  : "text-[var(--admin-notify-outbound-text)]"
              }`}
            >
              {recalcMessage}
            </span>
          )}
        </div>
        {snapshots.length > 0 && (
          <div className="space-y-2">
            <p className="admin-label">Снимки для отката</p>
            <ul className="space-y-2">
              {snapshots.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--admin-text)]">
                      {s.label ?? "Снимок"}
                    </div>
                    <div className="admin-muted text-xs">
                      {formatSnapshotWhen(s.createdAt)}
                      {s.matchCount != null ? ` · ${s.matchCount} встреч` : ""}
                      {` · ${s.playerCount} игроков`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreSnapshot(s.id)}
                    disabled={recalcStatus === "running" || restoreBusyId != null}
                    className="admin-btn admin-btn--outline shrink-0 px-3 py-1.5 text-xs"
                  >
                    {restoreBusyId === s.id ? "Восстанавливаем…" : "Вернуть"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--admin-border)] pt-5">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--admin-text)]">
            Превью (без записи в базу)
          </h3>
          <p className="admin-muted text-xs">
            Сравнение формул на истории матчей. Для авторежима важен общий рейтинг
            (источник SYSTEM).
          </p>
        </div>
        <RatingPreviewHelp />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TournamentRatingSourceSelect
          label="Источник для превью"
          value={ratingSource}
          onChange={setRatingSource}
        />
        {ratingSource === "CLUB" && (
          <SearchableSelect
            label="Клуб"
            options={clubOptions}
            value={clubId}
            onChange={setClubId}
            placeholder="Выберите клуб"
            searchPlaceholder="Клуб…"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runPreview}
          disabled={loading || (ratingSource === "CLUB" && !clubId)}
          className="admin-btn admin-btn--outline px-5 py-2 text-sm"
        >
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {loading ? "Считаем…" : "Показать превью всех формул"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {bundle && (
        <div className="space-y-10">
          <PreviewRunSummary preview={bundle.soft} />
          <p className="admin-muted text-xs">
            Выбранная для авто: <strong>{selectedOption.short}</strong> — блок ниже
            подсвечен.
          </p>
          {(
            [
              ["soft", "1. С форой", "Равные → ±0,25. Фаворит → ±0,1. Апсет → ±0,25."],
              [
                "upset_only",
                "2. Только равные и апсет",
                "Равные/апсет → ±0,25. Фаворит → 0.",
              ],
              [
                "upset_mild",
                "3. Мелкий шаг, фаворит 0",
                "Равные → ±0,1. Апсет → ±0,15. Фаворит → 0.",
              ],
              [
                "mild_all",
                "4. Мелкий шаг + фаворит",
                "Равные → ±0,1. Апсет → ±0,15. Фаворит → ±0,1.",
              ],
              [
                "tiny_equal",
                "5. Равные ещё мельче",
                "Равные → ±0,05. Апсет → ±0,15. Фаворит → ±0,1.",
              ],
              [
                "elo",
                "6. Elo",
                "Классический Elo на нашей шкале: чем неожиданнее результат, тем больше сдвиг (K=0,2).",
              ],
              [
                "micro_equal",
                "7. Равные ещё мельче",
                "Равные → ±0,025. Апсет → ±0,15. Фаворит → ±0,1.",
              ],
            ] as const
          ).map(([key, title, subtitle]) => (
            <div
              key={key}
              className={
                formula === key
                  ? "rounded-lg ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-transparent"
                  : undefined
              }
            >
              <PreviewFormulaBlock
                title={`${title}${formula === key ? " ← выбрана для авто" : ""}`}
                subtitle={subtitle}
                preview={previewForFormula(bundle, key)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PreviewRunSummary({ preview }: { preview: RatingPreviewResult }) {
  return (
    <div className="admin-inset space-y-2 p-4 text-xs leading-relaxed">
      <p className="font-medium text-sm">По этому запуску (общие данные)</p>
      <p>{preview.note}</p>
      <ul className="admin-muted list-disc space-y-1 pl-4">
        <li>
          В пуле {preview.players.length} игроков (от {preview.minTournaments} турниров),
          учтено матчей: {preview.matchesSimulated} из {preview.matchesLoaded} загруженных.
        </li>
        <li>Из них парных встреч учтено: {preview.matchesPairSimulated}.</li>
        <li>
          Пропущено, потому что сторона не набрала игроков из пула:{" "}
          {preview.matchesSkippedIneligible}.
        </li>
        {preview.usedHistoricalRatings ? (
          <li>
            Пропущено встреч до появления рейтингов в клубе (оба с нулём на старт тура):{" "}
            {preview.matchesSkippedUnrated}.
          </li>
        ) : (
          <li>
            Режим без истории: для силы соперников на каждый матч взят текущий рейтинг из
            базы.
          </li>
        )}
      </ul>
      <div className="flex flex-wrap gap-4 pt-2 text-sm">
        <Stat label="Игроков в пуле" value={String(preview.players.length)} />
        <Stat label="Матчей загружено" value={String(preview.matchesLoaded)} />
        <Stat label="Учтено в симуляции" value={String(preview.matchesSimulated)} />
        <Stat
          label="Пропущено (не в пуле)"
          value={String(preview.matchesSkippedIneligible)}
        />
        <Stat label="Парных учтено" value={String(preview.matchesPairSimulated)} />
        {preview.usedHistoricalRatings && (
          <Stat
            label="Пропущено без рейтинга"
            value={String(preview.matchesSkippedUnrated)}
          />
        )}
      </div>
    </div>
  );
}

function PreviewFormulaBlock({
  title,
  subtitle,
  preview,
}: {
  title: string;
  subtitle: string;
  preview: RatingPreviewResult;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("delta");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = preview.players;
    if (q) {
      rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv, "ru") * dir;
      }
      const an = av == null ? -1 : (av as number);
      const bn = bv == null ? -1 : (bv as number);
      return (an - bn) * dir;
    });
  }, [preview, search, sortKey, sortDir]);

  const expanded = preview.players.find((p) => p.playerId === expandedId) ?? null;

  return (
    <div className="space-y-4 border-t border-white/10 pt-8">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="admin-muted mt-1 text-xs leading-relaxed">{subtitle}</p>
      </div>

      <div>
        <AdminTableToolbar
          count={{ shown: filteredPlayers.length, total: preview.players.length }}
        >
          <AdminTableSearchField
            value={search}
            onChange={setSearch}
            placeholder="ФИО…"
          />
          <AdminFilterSelect
            label="Сортировка"
            options={[
              { value: "delta", label: "По delta" },
              { value: "name", label: "По имени" },
              { value: "proposedRating", label: "По предлагаемому" },
            ]}
            value={
              sortKey === "delta" ||
              sortKey === "name" ||
              sortKey === "proposedRating"
                ? sortKey
                : "delta"
            }
            onChange={(v) => {
              setSortKey(v as SortKey);
              setSortDir(v === "name" ? "asc" : "desc");
            }}
          />
        </AdminTableToolbar>

        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left text-sm">
            <thead>
              <tr>
                <AdminSortHeader
                  label="Игрок"
                  sortKey="name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="В базе"
                  sortKey="currentRating"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="Превью"
                  sortKey="proposedRating"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="Δ к базе"
                  sortKey="delta"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="Турн."
                  sortKey="tournaments"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="Матчи"
                  sortKey="matchesSimulated"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="W–L"
                  sortKey="wins"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label="% побед"
                  sortKey="winRate"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((p) => (
                <PlayerRow
                  key={`${preview.formula}-${p.playerId}`}
                  player={p}
                  expanded={expandedId === p.playerId}
                  onToggle={() =>
                    setExpandedId((id) => (id === p.playerId ? null : p.playerId))
                  }
                />
              ))}
              {filteredPlayers.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-muted px-3 py-4">
                    Нет игроков по фильтру
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {expanded && <MatchTrace player={expanded} />}
      <H2hSection rows={preview.h2hSkew} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-inset px-3 py-2">
      <p className="admin-muted text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PlayerRow({
  player,
  expanded,
  onToggle,
}: {
  player: RatingPreviewPlayerRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const deltaClass =
    player.delta > 0
      ? "text-emerald-400"
      : player.delta < 0
        ? "text-red-400"
        : "admin-muted";
  return (
    <tr
      className={`cursor-pointer ${expanded ? "admin-inset" : ""}`}
      onClick={onToggle}
    >
      <td className="px-3 py-2 font-medium">{player.name}</td>
      <td className="px-3 py-2">{formatPreviewRating(player.currentRating)}</td>
      <td className="px-3 py-2">{formatPreviewRating(player.proposedRating)}</td>
      <td className={`px-3 py-2 ${deltaClass}`}>{formatPreviewDelta(player.delta)}</td>
      <td className="px-3 py-2">{player.tournaments}</td>
      <td className="px-3 py-2">{player.matchesSimulated}</td>
      <td className="px-3 py-2">
        {player.wins}–{player.losses}
      </td>
      <td className="px-3 py-2">
        {player.winRate == null ? "—" : `${Math.round(player.winRate * 100)}%`}
      </td>
    </tr>
  );
}

function surnameOf(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

function RatingPreviewHelp() {
  return (
    <div className="admin-inset space-y-3 p-4 text-xs leading-relaxed">
      <div>
        <p className="mb-1 font-medium text-sm">Откуда рейтинг «до боя»</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>
            Клубный источник: для каждой встречи берём рейтинги обоих на{" "}
            <strong>старт того турнира</strong> (история правок клубного рейтинга в
            аудите).
          </li>
          <li>
            Если истории ещё нет — на матч подставляется <strong>текущий</strong> рейтинг
            из базы.
          </li>
          <li>
            Встречи, где на старт тура у обоих ещё 0, в расчёт не идут.
          </li>
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-sm">Формула 1 — с форой</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>Равные (разница меньше 0,5) → +0,25 / −0,25.</li>
          <li>Сильнее обыграл слабее → +0,1 / −0,1.</li>
          <li>Слабее обыграл сильнее → +0,25 / −0,25.</li>
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-sm">Формула 2 — только равные и апсет</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>Равные → +0,25 / −0,25.</li>
          <li>Слабее обыграл сильнее → +0,25 / −0,25.</li>
          <li>
            Сильнее обыграл слабее → <strong>0 / 0</strong> (рейтинг не двигается).
          </li>
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-sm">Формула 3 — только равные и апсет</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>Равные (разница не больше 0,5) → +0,1 / −0,1.</li>
          <li>Слабее обыграл сильнее → +0,15 / −0,15.</li>
          <li>
            Сильнее обыграл слабее → <strong>0 / 0</strong> (рейтинг не двигается).
          </li>
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-sm">Формула 4 — равные, апсет и фаворит</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>Равные (разница не больше 0,5) → +0,1 / −0,1.</li>
          <li>Слабее обыграл сильнее → +0,15 / −0,15.</li>
          <li>Сильнее обыграл слабее → +0,1 / −0,1.</li>
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-sm">Формула 5 — равные ещё мельче</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>Равные (разница не больше 0,5) → +0,05 / −0,05.</li>
          <li>Слабее обыграл сильнее → +0,15 / −0,15.</li>
          <li>Сильнее обыграл слабее → +0,1 / −0,1.</li>
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-sm">Общее</p>
        <ul className="admin-muted list-disc space-y-1 pl-4">
          <li>
            Парный матч: сила стороны = средний рейтинг двоих; дельта — каждому из пары.
          </li>
          <li>
            «До боя» — рейтинг на старт тура; «после» — накопительное превью формулы.
          </li>
          <li>Пол: с 1 и выше ниже 1 не падаем. Bye/walkover мимо. H2H — только соло.</li>
        </ul>
      </div>
    </div>
  );
}

function MatchTrace({ player }: { player: RatingPreviewPlayerRow }) {
  const who = surnameOf(player.name);
  return (
    <div className="admin-inset space-y-2 p-4">
      <h3 className="text-sm font-semibold">
        Цепочка матчей: {player.name} (
        {formatPreviewRating(player.currentRating)} →{" "}
        {formatPreviewRating(player.proposedRating)})
      </h3>
      <p className="admin-muted text-xs leading-relaxed">
        В строке: результат; рейтинг {who} и соперника на старт тура; дельта этой формулы;
        рейтинг {who} в превью после боя. Ноль в «Изменение» — бой не сдвинул рейтинг
        (для формулы 2 это победа фаворита над слабее).
      </p>
      {player.steps.length === 0 ? (
        <p className="admin-muted text-xs">Нет учтённых матчей в пуле.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1">Дата</th>
                <th className="px-2 py-1">Формат</th>
                <th className="px-2 py-1">Итог</th>
                <th className="px-2 py-1">{who} до боя</th>
                <th className="px-2 py-1">Соперник до боя</th>
                <th className="px-2 py-1">Изменение</th>
                <th className="px-2 py-1">{who} после</th>
              </tr>
            </thead>
            <tbody>
              {player.steps.map((s) => (
                <tr key={`${s.matchId}-${s.won ? "w" : "l"}`}>
                  <td className="whitespace-nowrap px-2 py-1">
                    {new Date(s.at).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-2 py-1">{s.isPair ? "Пара" : "Соло"}</td>
                  <td className="px-2 py-1">{s.won ? "Победа" : "Поражение"}</td>
                  <td className="px-2 py-1">
                    {who} {formatPreviewRating(s.ratingBefore)}
                  </td>
                  <td className="px-2 py-1">
                    {s.opponentName} {formatPreviewRating(s.opponentRatingBefore)}
                    {s.isPair ? " ср." : ""}
                  </td>
                  <td className="px-2 py-1">{formatPreviewDelta(s.delta)}</td>
                  <td className="px-2 py-1">
                    {who} {formatPreviewRating(s.ratingAfter)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function H2hSection({ rows }: { rows: RatingPreviewH2hRow[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Перекосы личных встреч (H2H)</h3>
      <p className="admin-muted mb-3 text-xs">
        Пары с достаточным числом встреч и winrate ≥ 70% у одной стороны.
      </p>
      {rows.length === 0 ? (
        <p className="admin-muted text-sm">Перекосов по порогу не найдено.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2">Игрок A</th>
                <th className="px-3 py-2">Игрок B</th>
                <th className="px-3 py-2">Счёт</th>
                <th className="px-3 py-2">Winrate A</th>
                <th className="px-3 py-2">Рейтинг сейчас</th>
                <th className="px-3 py-2">Превью</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.playerAId}-${r.playerBId}`}>
                  <td className="px-3 py-2">{r.playerAName}</td>
                  <td className="px-3 py-2">{r.playerBName}</td>
                  <td className="px-3 py-2">
                    {r.winsA}:{r.winsB} ({r.played})
                  </td>
                  <td className="px-3 py-2">{Math.round(r.winRateA * 100)}%</td>
                  <td className="px-3 py-2">
                    {formatPreviewRating(r.currentRatingA)} /{" "}
                    {formatPreviewRating(r.currentRatingB)}
                  </td>
                  <td className="px-3 py-2">
                    {formatPreviewRating(r.proposedRatingA)} /{" "}
                    {formatPreviewRating(r.proposedRatingB)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
