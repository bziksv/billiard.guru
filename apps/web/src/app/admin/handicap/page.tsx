"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatRating, MAX_PLAYER_RATING, RATING_STEP } from "@/lib/rating";
import { FALLBACK_TOURNAMENT_DEFAULTS } from "@/lib/tournament-defaults";
import {
  TOURNAMENT_RATING_SOURCE_OPTIONS,
  tournamentRatingSourceHint,
  type TournamentRatingSource,
} from "@/lib/tournament-rating-display";

type HandicapResult = {
  ratingA: number;
  ratingB: number;
  description: string;
  handicapBalls: number;
  strongerPlayer: string;
  halfStep: boolean;
  ratingMax: number | null;
  playerA: { eligible: boolean; message: string | null };
  playerB: { eligible: boolean; message: string | null };
};

const ratingHint = `0–${MAX_PLAYER_RATING}, шаг ${RATING_STEP}`;

export default function HandicapPage() {
  const [ratingA, setRatingA] = useState(1);
  const [ratingB, setRatingB] = useState(0);
  const [game, setGame] = useState(1);
  const [handicapHalfStep, setHandicapHalfStep] = useState(true);
  const [limitByRating, setLimitByRating] = useState(true);
  const [ratingMax, setRatingMax] = useState("8");
  const [ratingSource, setRatingSource] = useState<TournamentRatingSource>("CLUB");
  const [defaultsLoading, setDefaultsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<HandicapResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/tournament-defaults")
      .then((r) => (r.ok ? r.json() : FALLBACK_TOURNAMENT_DEFAULTS))
      .then(
        (data: {
          handicapHalfStep: boolean;
          limitByRating: boolean;
          ratingMax: number | null;
          ratingSource?: TournamentRatingSource;
        }) => {
          if (cancelled) return;
          setHandicapHalfStep(data.handicapHalfStep);
          setLimitByRating(data.limitByRating);
          if (data.limitByRating && data.ratingMax != null) {
            setRatingMax(String(data.ratingMax));
          }
          setRatingSource(data.ratingSource ?? "CLUB");
        },
      )
      .finally(() => {
        if (!cancelled) setDefaultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsedRatingMax = useMemo(() => {
    if (!limitByRating) return null;
    const v = parseFloat(ratingMax);
    return Number.isFinite(v) ? v : null;
  }, [limitByRating, ratingMax]);

  async function saveDefaults() {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/tournament-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handicapHalfStep,
          limitByRating,
          ratingMax: limitByRating ? parsedRatingMax : null,
          ratingSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        setSaveError(data.error ?? "Не удалось сохранить");
        return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setSaveError("Не удалось сохранить");
    }
  }

  async function calculate() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ratingA: String(ratingA),
        ratingB: String(ratingB),
        game: String(game),
        halfStep: handicapHalfStep ? "1" : "0",
      });
      if (parsedRatingMax != null) {
        params.set("ratingMax", String(parsedRatingMax));
      }
      const res = await fetch(`/api/handicap?${params}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="admin-page-title mb-2">Управление форами и расчётом</h1>
        <p className="admin-page-lead text-sm">
          Значения по умолчанию для новых турниров и калькулятор форы для проверки расчёта.
        </p>
      </div>

      <section className="admin-card p-6">
        <h2 className="mb-1 text-base font-semibold">Настройки по умолчанию</h2>
        <p className="admin-muted mb-5 text-xs">
          Подставляются при создании турнира в админке и в кабинете клуба. Уже созданные турниры
          меняются в «Настройки турнира» на странице турнира.
        </p>

        {defaultsLoading ? (
          <p className="admin-muted text-sm">Загрузка…</p>
        ) : (
          <div className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={handicapHalfStep}
                onChange={(e) => setHandicapHalfStep(e.target.checked)}
                className="admin-checkbox mt-0.5"
              />
              <span>
                <span className="font-medium">Учитывать рейтинг 0,5</span>
                <span className="admin-muted mt-1 block text-xs">
                  Включено: фора по шагу 0,5 (+1 шар в нечётных при дробной разнице). Выключено —
                  рейтинги для форы округляются вниз до целого (1,5 → 1), без доп. шара в
                  нечётных (3 vs 1,5 → 2 шара; 3,5 vs 0 → 3 шара).
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={limitByRating}
                onChange={(e) => setLimitByRating(e.target.checked)}
                className="admin-checkbox mt-0.5"
              />
              <span className="font-medium">Ограничить максимальный рейтинг участника</span>
            </label>

            {limitByRating && (
              <div className="space-y-4">
                <SearchableSelect
                  label="Источник рейтинга для лимита"
                  options={TOURNAMENT_RATING_SOURCE_OPTIONS}
                  value={ratingSource}
                  onChange={(v) => setRatingSource(v as TournamentRatingSource)}
                  placeholder="Источник рейтинга"
                  searchPlaceholder="Рейтинг…"
                />
                <div>
                  <label className="admin-label">Максимальный рейтинг ({ratingHint})</label>
                  <input
                    type="number"
                    step={RATING_STEP}
                    min={0}
                    max={MAX_PLAYER_RATING}
                    value={ratingMax}
                    onChange={(e) => setRatingMax(e.target.value)}
                    className="admin-input w-full max-w-xs px-3 py-2"
                  />
                  <p className="admin-muted mt-1 text-xs">
                    {tournamentRatingSourceHint(ratingSource)} Выше лимита — без записи и без
                    уведомления «турнир рядом».
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={saveDefaults}
                disabled={
                  saveStatus === "saving" || (limitByRating && parsedRatingMax == null)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveStatus === "saving" && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {saveStatus === "saving" ? "Сохранение…" : "Сохранить"}
              </button>
              {saveStatus === "saved" && (
                <span className="text-sm text-emerald-400">Сохранено</span>
              )}
              {saveError && <span className="text-sm text-red-400">{saveError}</span>}
            </div>
          </div>
        )}
      </section>

      <section className="admin-card space-y-5 p-6">
        <h2 className="text-base font-semibold">Проверка расчёта</h2>
        <p className="admin-muted -mt-3 text-xs">
          Введите рейтинги для моделирования матча (до {MAX_PLAYER_RATING}, независимо от лимита
          турнира).
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label">Рейтинг игрока A</label>
            <input
              type="number"
              step={RATING_STEP}
              min={0}
              max={MAX_PLAYER_RATING}
              value={ratingA}
              onChange={(e) => setRatingA(parseFloat(e.target.value) || 0)}
              className="admin-input w-full px-3 py-2"
            />
          </div>
          <div>
            <label className="admin-label">Рейтинг игрока B</label>
            <input
              type="number"
              step={RATING_STEP}
              min={0}
              max={MAX_PLAYER_RATING}
              value={ratingB}
              onChange={(e) => setRatingB(parseFloat(e.target.value) || 0)}
              className="admin-input w-full px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="admin-label">Номер партии</label>
          <input
            type="number"
            min={1}
            value={game}
            onChange={(e) => setGame(parseInt(e.target.value, 10) || 1)}
            className="admin-input w-full max-w-xs px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={calculate}
          disabled={loading || (limitByRating && parsedRatingMax == null)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {loading ? "Расчёт…" : "Рассчитать"}
        </button>

        {result && (
          <div className="admin-inset space-y-3 p-4 text-sm">
            {result.ratingMax != null && (
              <p className="admin-text-secondary">
                Лимит турнира: до {formatRating(result.ratingMax)}
              </p>
            )}
            <PlayerEligibility label="A" rating={result.ratingA} info={result.playerA} />
            <PlayerEligibility label="B" rating={result.ratingB} info={result.playerB} />

            <div className="admin-divider" />

            <p>
              Сильнейший: игрок <strong>{result.strongerPlayer}</strong>
              {!result.halfStep && <span className="admin-muted"> · без шага 0,5</span>}
            </p>
            <p className="admin-text-secondary">{result.description}</p>
            <p className="admin-stat-value text-base">
              Фора в партии {game}: {result.handicapBalls} шар(ов)
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function PlayerEligibility({
  label,
  rating,
  info,
}: {
  label: string;
  rating: number;
  info: { eligible: boolean; message: string | null };
}) {
  return (
    <div
      className={
        info.eligible
          ? "rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2"
          : "rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2"
      }
    >
      <p className="font-medium">
        Игрок {label}: {formatRating(rating)}
      </p>
      {info.message && (
        <p
          className={`mt-1 text-xs ${info.eligible ? "text-emerald-300/90" : "text-amber-200/90"}`}
        >
          {info.message}
        </p>
      )}
    </div>
  );
}
