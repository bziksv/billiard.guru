"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function PlayerAboutEditor({ playerId }: { playerId: string }) {
  const t = useTranslations("pages.cabinet");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [about, setAbout] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/me/profile");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("loadError"));
      return;
    }
    setAbout(data.about ?? "");
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ about: about.trim() || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? t("saveError"));
      return;
    }
    setAbout(data.about ?? "");
    setMessage(t("aboutSaved"));
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("loading")}</p>;
  }

  return (
    <section className="site-card space-y-4 p-5">
      <div>
        <h2 className="site-section-title text-lg">{t("aboutTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {t("aboutLead")}{" "}
          <Link href={`/players/${playerId}`} className="text-emerald-600 hover:underline">
            {t("aboutProfileLink")}
          </Link>
          .
        </p>
      </div>

      <label className="block text-sm">
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder={t("aboutPlaceholder")}
          className="site-input w-full resize-y"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button type="button" onClick={() => void save()} disabled={saving} className="site-btn-primary">
        {saving ? t("saving") : t("save")}
      </button>
    </section>
  );
}
