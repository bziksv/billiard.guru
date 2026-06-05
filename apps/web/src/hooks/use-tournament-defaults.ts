"use client";

import { useEffect, useState } from "react";
import {
  FALLBACK_TOURNAMENT_DEFAULTS,
  type TournamentDefaults,
} from "@/lib/tournament-defaults";

export function useTournamentDefaults() {
  const [defaults, setDefaults] = useState<TournamentDefaults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tournament-defaults")
      .then((r) => (r.ok ? r.json() : FALLBACK_TOURNAMENT_DEFAULTS))
      .then((data: TournamentDefaults) => {
        if (!cancelled) setDefaults(data);
      })
      .catch(() => {
        if (!cancelled) setDefaults(FALLBACK_TOURNAMENT_DEFAULTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    defaults: defaults ?? FALLBACK_TOURNAMENT_DEFAULTS,
    loading,
    ready: defaults !== null,
  };
}
