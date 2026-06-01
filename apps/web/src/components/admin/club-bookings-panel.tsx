"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { todayDayKey } from "@/lib/club-bookings-calendar";

export function ClubBookingsPanel({ clubId }: { clubId: string }) {
  const [pending, setPending] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/clubs/${clubId}/bookings?calendar=1&from=${encodeURIComponent(todayDayKey())}&days=7`,
    );
    const data = await res.json();
    if (res.ok && data.stats) {
      setPending(data.stats.pending);
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      {pending !== null && pending > 0 && (
        <p className="text-sm text-amber-600">
          Ожидают подтверждения: <strong>{pending}</strong>
        </p>
      )}
      <Link href={`/manage/clubs/${clubId}/bookings`} className="admin-btn admin-btn--primary inline-flex">
        Открыть расписание броней
      </Link>
      <p className="admin-muted text-xs">
        Сетка столов, ручная бронь, блокировки, экспорт и история — на отдельной странице.
      </p>
    </div>
  );
}
