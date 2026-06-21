"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { canCancelRegistration } from "@/lib/tournament-registration";

function cancelRegistrationLabel(
  registrationStatus: string,
  t: ReturnType<typeof useTranslations<"detail.tournament">>,
): string {
  if (registrationStatus === "PENDING") return t("cancelPending");
  if (registrationStatus === "CONFIRMED") return t("cancelConfirmed");
  return t("cancelDefault");
}

export function RegistrationCancelButton({
  registrationId,
  tournamentStatus,
  registrationStatus,
  bracketFormed = false,
  className,
}: {
  registrationId: string;
  tournamentStatus: string;
  registrationStatus: string;
  bracketFormed?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("detail.tournament");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    !["PENDING", "CONFIRMED"].includes(registrationStatus) ||
    !canCancelRegistration(tournamentStatus, "player", bracketFormed)
  ) {
    return null;
  }

  async function cancel() {
    const label = cancelRegistrationLabel(registrationStatus, t);
    if (!confirm(`${label}?`)) return;

    setLoading(true);
    setError(null);
    const res = await fetch("/api/tournaments/register", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: registrationId, status: "CANCELLED" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("cancelFailed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={cancel}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {loading ? "…" : cancelRegistrationLabel(registrationStatus, t)}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
