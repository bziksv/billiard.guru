"use client";

import { useEffect, useState } from "react";

/** playerId → клубный рейтинг */
export function useClubPlayerRatings(clubId: string) {
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    fetch(`/api/clubs/${clubId}/player-ratings`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { playerId: string; rating: number }[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        const map: Record<string, number> = {};
        for (const row of rows) map[row.playerId] = row.rating;
        setRatings(map);
      })
      .catch(() => {
        if (!cancelled) setRatings({});
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  return ratings;
}
