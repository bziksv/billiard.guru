"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  canCancelRegistration,
  cancelRegistrationLabel,
} from "@/lib/tournament-registration";

export function RegistrationCancelButton({
  registrationId,
  tournamentStatus,
  registrationStatus,
  className,
}: {
  registrationId: string;
  tournamentStatus: string;
  registrationStatus: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    !["PENDING", "CONFIRMED"].includes(registrationStatus) ||
    !canCancelRegistration(tournamentStatus, "player")
  ) {
    return null;
  }

  async function cancel() {
    const label = cancelRegistrationLabel(registrationStatus);
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
      setError(data.error ?? "Не удалось отменить");
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
        {loading ? "…" : cancelRegistrationLabel(registrationStatus)}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
