"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { TournamentManageView } from "@/components/admin/tournament-manage-view";
import type { MatchResultPayload } from "@/components/bracket/match-result-modal";
import { TournamentRatingRulesSummary } from "@/components/tournament/tournament-rating-rules-summary";
import {
  canStartTournament,
  countConfirmedParticipants,
  type AdminTournament,
} from "@/lib/tournament-admin";
import { useClubPlayerRatings } from "@/hooks/use-club-player-ratings";
import { formatTournamentPlayerSelectLabel } from "@/lib/tournament-rating-display";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
  phone?: string | null;
  city?: { nameRu: string; country?: { nameRu: string } | null } | null;
}

export function ClubOwnerTournamentManagePage({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const { tid: tournamentId } = useParams<{ tid: string }>();
  const router = useRouter();
  const clubPlayerRatings = useClubPlayerRatings(clubId);
  const [tournament, setTournament] = useState<AdminTournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishWithoutNotifications, setPublishWithoutNotifications] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    if (res.status === 404 || res.status === 403) {
      router.replace(`/manage/clubs/${clubId}/tournaments`);
      return;
    }
    const data = await res.json();
    if (data?.error) {
      router.replace(`/manage/clubs/${clubId}/tournaments`);
      return;
    }
    if (data.club?.id !== clubId) {
      router.replace(`/manage/clubs/${clubId}/tournaments`);
      return;
    }
    setTournament(data);
    setPublishWithoutNotifications(data.suppressNotifications === true);
  }, [clubId, router, tournamentId]);

  const handlePlayerCreated = useCallback(
    (player: { id: string; firstName: string; lastName: string; rating: number }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === player.id)) return prev;
        return [...prev, player].sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "ru"),
        );
      });
    },
    [],
  );

  useEffect(() => {
    Promise.all([
      fetch(`/api/tournaments/${tournamentId}`).then((r) => r.json()),
      fetch("/api/players").then((r) => r.json()),
    ]).then(([t, p]) => {
      if (t?.error || t?.club?.id !== clubId) {
        router.replace(`/manage/clubs/${clubId}/tournaments`);
        return;
      }
      setTournament(t);
      setPublishWithoutNotifications(t.suppressNotifications === true);
      setPlayers(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, [clubId, router, tournamentId]);

  const clubOptions = useMemo(
    () => [{ value: clubId, label: clubName }],
    [clubId, clubName],
  );

  const playerOptions = useMemo(
    () =>
      players.map((p) => ({
        value: p.id,
        label: formatTournamentPlayerSelectLabel(
          p,
          clubPlayerRatings[p.id],
          tournament?.ratingSource ?? "CLUB",
        ),
      })),
    [players, clubPlayerRatings, tournament?.ratingSource],
  );

  async function publishTournament() {
    if (!tournament) return;
    setPublishing(true);
    setRegError(null);
    setRegMessage(null);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suppressNotifications: publishWithoutNotifications }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error ?? "Не удалось опубликовать турнир");
        return;
      }
      setRegMessage(data.message ?? "Турнир опубликован");
      await reload();
    } finally {
      setPublishing(false);
    }
  }

  async function startTournament() {
    if (!tournament) return;
    setStarting(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) {
      alert(data.error ?? "Не удалось начать турнир");
      return;
    }
    setTournament(data);
  }

  async function finishTournament() {
    if (!tournament || !confirm("Завершить турнир?")) return;
    setFinishing(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "FINISHED" }),
    });
    const data = await res.json();
    setFinishing(false);
    if (!res.ok) {
      alert(data.error ?? "Не удалось завершить турнир");
      return;
    }
    router.push(`/manage/clubs/${clubId}/tournaments`);
  }

  async function deleteTournament() {
    if (!tournament) return;
    if (
      !confirm(
        `Удалить турнир «${tournament.name}»?\n\nРегистрации, команды и матчи будут удалены.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Не удалось удалить");
      return;
    }
    router.push(`/manage/clubs/${clubId}/tournaments`);
  }

  async function confirmRegistration(regId: string) {
    await fetch("/api/tournaments/register", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regId, status: "CONFIRMED" }),
    });
    await reload();
  }

  async function rejectRegistration(regId: string) {
    await fetch("/api/tournaments/register", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regId, status: "REJECTED" }),
    });
    await reload();
  }

  async function cancelRegistration(regId: string) {
    if (!confirm("Снять участника с турнира?")) return;
    const res = await fetch("/api/tournaments/register", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: regId, status: "CANCELLED" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Не удалось снять участника");
      return;
    }
    await reload();
  }

  async function confirmTeam(teamId: string) {
    await fetch("/api/tournaments/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: teamId, status: "CONFIRMED" }),
    });
    await reload();
  }

  async function generateBracket() {
    if (!tournament) return;
    setBracketLoading(true);
    const res = await fetch("/api/tournaments/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: tournament.id }),
    });
    const data = await res.json();
    setBracketLoading(false);
    if (!res.ok) {
      alert(data.error ?? "Не удалось сформировать сетку");
      return;
    }
    await reload();
  }

  async function saveMatchResult(payload: MatchResultPayload) {
    const res = await fetch("/api/tournaments/bracket", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Ошибка");
    }
    await reload();
  }

  async function cancelMatchResult(matchId: string) {
    const res = await fetch("/api/tournaments/bracket", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось отменить");
    }
    await reload();
  }

  async function resetAllMatches() {
    if (!tournament) return;
    const res = await fetch("/api/tournaments/bracket", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: tournament.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось отменить встречи");
    }
    await reload();
  }

  async function regenerateBracketGrid() {
    if (!tournament) return;
    const res = await fetch("/api/tournaments/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: tournament.id, regenerate: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось пересоздать сетку");
    }
    await reload();
  }

  async function deleteBracketGrid() {
    if (!tournament) return;
    setBracketLoading(true);
    const res = await fetch("/api/tournaments/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: tournament.id, deleteBracket: true }),
    });
    const data = await res.json();
    setBracketLoading(false);
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось снести сетку");
    }
    await reload();
  }

  if (loading || !tournament) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  const canStart = canStartTournament(tournament);
  const confirmed = countConfirmedParticipants(tournament);

  return (
    <div className="min-w-0 w-full space-y-8">
      <div>
        <Link
          href={`/manage/clubs/${clubId}/tournaments`}
          className="text-sm text-emerald-400 hover:underline"
        >
          ← Турниры
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
              <StatusBadge
                status={tournament.status}
                label={TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {tournamentFormatDisplayLabel(tournament)} · {clubName} · {confirmed}{" "}
              подтверждённых
            </p>
            <TournamentRatingRulesSummary
              tournament={tournament}
              className="mt-1 text-sm text-zinc-500"
            />
            {tournament.status === "PENDING_CLUB_APPROVAL" && (
              <p className="mt-2 text-sm text-amber-400/90">
                Ждёт публикации. Если кнопка в Telegram не сработала — отметьте «Без уведомлений» при
                необходимости и нажмите «Опубликовать турнир».
              </p>
            )}
            {tournament.suppressNotifications && (
              <p className="mt-2 text-sm text-zinc-500">Уведомления по турниру отключены.</p>
            )}
            {regError && <p className="mt-2 text-sm text-red-400">{regError}</p>}
            {regMessage && <p className="mt-2 text-sm text-emerald-400">{regMessage}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {tournament.status === "PENDING_CLUB_APPROVAL" && (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
                  checked={publishWithoutNotifications}
                  onChange={(e) => setPublishWithoutNotifications(e.target.checked)}
                />
                <span>
                  Без уведомлений
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Не слать «Новый турнир рядом» и другие Telegram по этому турниру.
                  </span>
                </span>
              </label>
            )}
            <div className="flex flex-wrap gap-2">
            {tournament.status === "PENDING_CLUB_APPROVAL" && (
              <button
                type="button"
                disabled={publishing}
                onClick={publishTournament}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing && (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                )}
                {publishing ? "Публикация…" : "Опубликовать турнир"}
              </button>
            )}
            {canStart && (
              <button
                type="button"
                disabled={starting}
                onClick={startTournament}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {starting ? "Запуск…" : "Начать турнир"}
              </button>
            )}
            {tournament.status === "ACTIVE" && (
              <button
                type="button"
                disabled={finishing}
                onClick={finishTournament}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-50"
              >
                {finishing ? "…" : "Завершить"}
              </button>
            )}
            <Link
              href={`/tournaments/${tournament.id}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-600"
            >
              На сайте
            </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="admin-card min-w-0 max-w-full p-6">
        <TournamentManageView
          tournament={tournament}
          clubOptions={clubOptions}
          playerOptions={playerOptions}
          clubPlayerRatings={clubPlayerRatings}
          registrationPlayers={players}
          onPlayerCreated={handlePlayerCreated}
          bracketLoading={bracketLoading}
          embedded
          onConfirmRegistration={confirmRegistration}
          onRejectRegistration={rejectRegistration}
          onCancelRegistration={cancelRegistration}
          onConfirmTeam={confirmTeam}
          onGenerateBracket={generateBracket}
          onResetAllMatches={resetAllMatches}
          onRegenerateBracket={regenerateBracketGrid}
          onDeleteBracket={deleteBracketGrid}
          onSaveMatchResult={saveMatchResult}
          onCancelMatchResult={cancelMatchResult}
          onUpdated={reload}
          onDelete={deleteTournament}
        />
      </section>
    </div>
  );
}
