"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import {
  ClubPriceTiersFields,
  DEMO_PRICE_TIERS,
} from "@/components/admin/club-schedule-fields";
import {
  parsePriceTiers,
  priceTiersToJson,
  type PriceTier,
} from "@/lib/club-schedule";

export function ClubPriceTiersEditor({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName?: string;
}) {
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clubs/${clubId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Клуб не найден");
      setLoading(false);
      return;
    }
    const tiers = parsePriceTiers(data.priceTiers);
    setPriceTiers(tiers.length > 0 ? tiers : DEMO_PRICE_TIERS);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceTiers: priceTiersToJson(priceTiers) }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось сохранить");
      return;
    }
    setPriceTiers(parsePriceTiers(data.priceTiers));
    setMessage("Тарифы сохранены");
  }

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;

  return (
    <div className="club-price-tiers-editor space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="admin-page-title text-2xl font-bold">Тарифы клуба</h1>
          {clubName && <p className="admin-muted mt-1 text-sm">{clubName}</p>}
          <p className="admin-page-lead mt-2 max-w-2xl text-sm">
            Почасовые и фиксированные тарифы показываются на сайте и на плане зала. Можно назначить
            разные тарифы отдельным столам в разделе «План зала».
          </p>
        </div>
        <SectionLogsButton section="tariffs" clubId={clubId} />
      </div>

      <div className="flex items-start gap-6 lg:gap-10">
        <div className="min-w-0 max-w-2xl flex-1">
          <div className="admin-card rounded-xl border p-6">
            <ClubPriceTiersFields tiers={priceTiers} onChange={setPriceTiers} />
          </div>
        </div>

        <aside
          className="sticky top-6 hidden w-40 shrink-0 self-start md:block"
          aria-live="polite"
        >
          <div className="admin-card rounded-xl border p-4 shadow-xl">
            {message && (
              <p className="mb-3 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {message}
              </p>
            )}
            {error && !message && (
              <p className="mb-3 text-center text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="admin-btn admin-btn--primary w-full py-3"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-4 right-4 z-50 md:hidden" aria-live="polite">
        <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/95 py-2 pl-4 pr-2 shadow-xl shadow-black/40 backdrop-blur-sm">
          {message && <span className="text-xs font-medium text-emerald-400">{message}</span>}
          {error && !message && <span className="text-xs font-medium text-red-400">{error}</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
