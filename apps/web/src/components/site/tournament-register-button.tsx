"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function TournamentRegisterButton({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const router = useRouter();
  const t = useTranslations("tournamentRegister");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tournaments/self-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("error"));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={apply}
        disabled={loading}
        className="site-btn-primary disabled:opacity-50"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <p className="mt-2 text-xs text-zinc-500">{t("hint")}</p>
    </div>
  );
}
