"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CitySelect } from "@/components/admin/city-select";

export function PlayerCitySettings({ initialCityId }: { initialCityId: string }) {
  const t = useTranslations("pages.cabinet");
  const router = useRouter();
  const [cityId, setCityId] = useState(initialCityId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!cityId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? t("saveError"));
      return;
    }
    setMessage(t("citySaved"));
    router.refresh();
  }

  return (
    <section className="site-card space-y-4 p-5">
      <div>
        <h2 className="site-section-title text-lg">{t("cityTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t("cityLead")}</p>
      </div>

      <CitySelect value={cityId} onChange={setCityId} />

      <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
        {t("cityRadiusNote")}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !cityId || cityId === initialCityId}
        className="site-btn-primary"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </section>
  );
}
