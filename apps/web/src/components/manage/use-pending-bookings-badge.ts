"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CLUB_PENDING_BOOKINGS_EVENT,
  type ClubPendingBookingsDetail,
} from "@/lib/club-pending-bookings-badge";

const POLL_MS = 15_000;

export function usePendingBookingsBadge(clubId: string): number {
  const pathname = usePathname();
  const onBookingsPage = pathname.startsWith(`/manage/clubs/${clubId}/bookings`);
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/bookings/pending-count`);
      if (!res.ok) return;
      const json = (await res.json()) as { count?: number };
      if (typeof json.count === "number") setCount(json.count);
    } catch {
      /* ignore network errors between polls */
    }
  }, [clubId]);

  useEffect(() => {
    void fetchCount();
    const timer = window.setInterval(() => void fetchCount(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [fetchCount]);

  useEffect(() => {
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<ClubPendingBookingsDetail>).detail;
      if (detail.clubId === clubId) setCount(detail.count);
    }
    window.addEventListener(CLUB_PENDING_BOOKINGS_EVENT, onUpdate);
    return () => window.removeEventListener(CLUB_PENDING_BOOKINGS_EVENT, onUpdate);
  }, [clubId]);

  if (onBookingsPage) return 0;
  return count;
}
