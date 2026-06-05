"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { TournamentManageView } from "@/components/admin/tournament-manage-view";
import type { MatchResultPayload } from "@/components/bracket/match-result-modal";
import { TournamentParticipantLimitNotice } from "@/components/tournament/tournament-participant-limit-notice";
import { SearchableMultiSelect, SearchableSelect } from "@/components/ui/searchable-select";
import { getDefaultBracketParticipantRules } from "@/lib/bracket-participant-rules";
import {
  countActiveTournamentSlots,
  slotsRemaining,
  validateCanAddParticipants,
} from "@/lib/tournament-participant-limit";
import {
  canStartTournament,
  countConfirmedParticipants,
  type AdminTournament,
} from "@/lib/tournament-admin";
import { isPairFormat } from "@/lib/pair-tournament";
import { useClubPlayerRatings } from "@/hooks/use-club-player-ratings";
import {
  formatTournamentPlayerSelectLabel,
  playerExceedsTournamentRatingMax,
} from "@/lib/tournament-rating-display";
import { TournamentRatingRulesSummary } from "@/components/tournament/tournament-rating-rules-summary";
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/validators";

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
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedPlayer2, setSelectedPlayer2] = useState("");
  const [teamName, setTeamName] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
  }, [clubId, router, tournamentId]);

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
        label: formatTournamentPlayerSelectLabel(p, clubPlayerRatings[p.id]),
      })),
    [players, clubPlayerRatings],
  );

  const isPair = tournament ? isPairFormat(tournament.format) : false;

  const registeredPlayerIds = useMemo(() => {
    if (!tournament || isPair) return new Set<string>();
    return new Set(
      tournament.registrations
        .filter((r) => !["CANCELLED", "REJECTED"].includes(r.status))
        .map((r) => r.player.id),
    );
  }, [tournament, isPair]);

  const availablePlayerOptions = useMemo(() => {
    const ratingMax = tournament?.ratingMax ?? null;
    return playerOptions.filter((opt) => {
      if (registeredPlayerIds.has(opt.value)) return false;
      if (ratingMax == null) return true;
      const player = players.find((p) => p.id === opt.value);
      if (!player) return true;
      return !playerExceedsTournamentRatingMax(
        player.rating,
        ratingMax,
        clubPlayerRatings[player.id],
      );
    });
  }, [
    playerOptions,
    registeredPlayerIds,
    tournament?.ratingMax,
    players,
    clubPlayerRatings,
  ]);

  useEffect(() => {
    if (tournament?.ratingMax == null) return;
    setSelectedPlayerIds((ids) =>
      ids.filter((id) => {
        const player = players.find((p) => p.id === id);
        if (!player) return false;
        return !playerExceedsTournamentRatingMax(
          player.rating,
          tournament.ratingMax,
          clubPlayerRatings[id],
        );
      }),
    );
  }, [tournament?.ratingMax, clubPlayerRatings, players]);

  const activeParticipantCount = useMemo(
    () => (tournament ? countActiveTournamentSlots(tournament) : 0),
    [tournament],
  );

  const participantRules = useMemo(
    () =>
      tournament?.participantRules ??
      (tournament ? getDefaultBracketParticipantRules(tournament.format) : null),
    [tournament],
  );

  const slotsLeft = useMemo(
    () => (participantRules ? slotsRemaining(participantRules, activeParticipantCount) : Infinity),
    [participantRules, activeParticipantCount],
  );

  function handlePlayerSelectChange(ids: string[]) {
    if (!participantRules) {
      setSelectedPlayerIds(ids);
      return;
    }
    const maxSelectable = slotsRemaining(participantRules, activeParticipantCount);
    if (ids.length > maxSelectable) {
      const check = validateCanAddParticipants(
        participantRules,
        activeParticipantCount,
        ids.length,
      );
      setRegError(check.ok ? null : check.error);
      setSelectedPlayerIds(ids.slice(0, maxSelectable));
      return;
    }
    setRegError(null);
    setSelectedPlayerIds(ids);
  }

  async function publishTournament() {
    if (!tournament) return;
    setPublishing(true);
    setRegError(null);
    setRegMessage(null);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/publish`, { method: "POST" });
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
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Не удалось удалить");
        return;
      }
      router.push(`/manage/clubs/${clubId}/tournaments`);
    } finally {
      setDeleting(false);
    }
  }

  async function registerParticipant() {
    if (!tournament) return;
    setRegError(null);
    setRegMessage(null);

    if (isPair) {
      if (!selectedPlayer || !selectedPlayer2) {
        setRegError("Выберите двух игроков в команде");
        return;
      }
      setRegLoading(true);
      const res = await fetch("/api/tournaments/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          player1Id: selectedPlayer,
          player2Id: selectedPlayer2,
          name: teamName || undefined,
          clubId,
          source: "CLUB",
        }),
      });
      const data = await res.json();
      setRegLoading(false);
      if (!res.ok) {
        setRegError(data.error ?? "Ошибка регистрации");
        return;
      }
      setSelectedPlayer("");
      setSelectedPlayer2("");
      setTeamName("");
      setRegMessage("Команда зарегистрирована");
    } else {
      if (selectedPlayerIds.length === 0) {
        setRegError("Выберите хотя бы одного игрока");
        return;
      }
      setRegLoading(true);
      let registered = 0;
      let skipped = 0;
      for (const playerId of selectedPlayerIds) {
        const res = await fetch("/api/tournaments/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId: tournament.id,
            playerId,
            clubId,
            source: "CLUB",
          }),
        });
        if (res.status === 409) skipped++;
        else if (res.ok) registered++;
        else {
          const data = await res.json();
          setRegError(data.error ?? "Ошибка регистрации");
          break;
        }
      }
      setRegLoading(false);
      setSelectedPlayerIds([]);
      setRegMessage(`зарегистрировано: ${registered}${skipped ? ` · уже были: ${skipped}` : ""}`);
    }
    await reload();
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
    <div className="space-y-8">
      <div>
        <Link
          href={`/manage/clubs/${clubId}/tournaments`}
          className="text-sm text-emerald-400 hover:underline"
        >
          ← Турниры
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
              <StatusBadge
                status={tournament.status}
                label={TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {TOURNAMENT_FORMAT_LABELS[tournament.format]} · {clubName} · {confirmed}{" "}
              подтверждённых
            </p>
            <TournamentRatingRulesSummary
              tournament={tournament}
              className="mt-1 text-sm text-zinc-500"
            />
            {tournament.status === "PENDING_CLUB_APPROVAL" && (
              <p className="mt-2 text-sm text-amber-400/90">
                Ждёт публикации. Если кнопка в Telegram не сработала — нажмите «Опубликовать турнир».
              </p>
            )}
          </div>
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
            <button
              type="button"
              disabled={deleting}
              onClick={deleteTournament}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Удаление…" : "Удалить турнир"}
            </button>
          </div>
        </div>
      </div>

      {tournament.status === "OPEN" && (
        <section className="admin-card p-6">
          <h2 className="mb-4 font-semibold">Регистрация участников</h2>
          {participantRules && (
            <TournamentParticipantLimitNotice
              rules={participantRules}
              activeCount={activeParticipantCount}
              className="mb-4"
            />
          )}
          <div className="max-w-2xl space-y-3">
            {isPair ? (
              <>
                <SearchableSelect
                  options={playerOptions}
                  value={selectedPlayer}
                  onChange={setSelectedPlayer}
                  placeholder="Игрок 1"
                  searchPlaceholder="Поиск игрока…"
                />
                <SearchableSelect
                  options={playerOptions.filter((p) => p.value !== selectedPlayer)}
                  value={selectedPlayer2}
                  onChange={setSelectedPlayer2}
                  placeholder="Игрок 2 (партнёр)"
                  searchPlaceholder="Поиск игрока…"
                />
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Название команды (необязательно)"
                  className="site-input w-full"
                />
              </>
            ) : (
              <SearchableMultiSelect
                label="Игроки"
                options={availablePlayerOptions}
                values={selectedPlayerIds}
                onChange={handlePlayerSelectChange}
                placeholder={
                  slotsLeft <= 0
                    ? "Лимит сетки заполнен — смените формат или снимите участников"
                    : "Выберите одного или нескольких игроков"
                }
                searchPlaceholder="Поиск игрока…"
                disabled={slotsLeft <= 0}
              />
            )}
            {regError && <p className="text-sm text-red-400">{regError}</p>}
            {regMessage && <p className="text-sm text-emerald-400">{regMessage}</p>}
            <button
              type="button"
              onClick={registerParticipant}
              disabled={
                regLoading ||
                slotsLeft <= 0 ||
                (isPair ? !selectedPlayer || !selectedPlayer2 : selectedPlayerIds.length === 0)
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {regLoading
                ? "Регистрация…"
                : isPair
                  ? "Зарегистрировать команду"
                  : selectedPlayerIds.length > 0
                    ? `Зарегистрировать (${selectedPlayerIds.length})`
                    : "Зарегистрировать"}
            </button>
          </div>
        </section>
      )}

      <section className="admin-card p-6">
        <TournamentManageView
          tournament={tournament}
          clubOptions={clubOptions}
          playerOptions={playerOptions}
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
