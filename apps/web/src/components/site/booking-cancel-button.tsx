"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookingCancelButton({
  clubId,
  bookingId,
  startsAt,
  className,
}: {
  clubId: string;
  bookingId: string;
  startsAt: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (new Date(startsAt) <= new Date()) return null;

  async function cancel() {
    if (!confirm("Отменить бронь?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
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
        className="text-sm text-red-400 hover:underline disabled:opacity-60"
      >
        {loading ? "…" : "Отменить бронь"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
