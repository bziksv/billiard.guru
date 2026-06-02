"use client";

import { useCallback, useState } from "react";
import type { MatchResultPayload } from "@/components/bracket/match-result-modal";

export function useAdminTournamentBracketActions(
  tournamentId: string | undefined,
  onReload: () => void | Promise<void>,
) {
  const [bracketLoading, setBracketLoading] = useState(false);

  const generateBracket = useCallback(async () => {
    if (!tournamentId) return;
    setBracketLoading(true);
    const res = await fetch("/api/tournaments/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId }),
    });
    const data = await res.json();
    setBracketLoading(false);
    if (!res.ok) {
      alert(data.error ?? "Не удалось сформировать сетку");
      return;
    }
    await onReload();
  }, [tournamentId, onReload]);

  const saveMatchResult = useCallback(
    async (payload: MatchResultPayload) => {
      const res = await fetch("/api/tournaments/bracket", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Ошибка");
      }
      await onReload();
    },
    [onReload],
  );

  const cancelMatchResult = useCallback(
    async (matchId: string) => {
      const res = await fetch("/api/tournaments/bracket", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось отменить");
      }
      await onReload();
    },
    [onReload],
  );

  const resetAllMatches = useCallback(async () => {
    if (!tournamentId) return;
    const res = await fetch("/api/tournaments/bracket", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось отменить встречи");
    }
    await onReload();
  }, [tournamentId, onReload]);

  const regenerateBracketGrid = useCallback(async () => {
    if (!tournamentId) return;
    const res = await fetch("/api/tournaments/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId, regenerate: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось пересоздать сетку");
    }
    await onReload();
  }, [tournamentId, onReload]);

  return {
    bracketLoading,
    generateBracket,
    saveMatchResult,
    cancelMatchResult,
    resetAllMatches,
    regenerateBracketGrid,
  };
}
