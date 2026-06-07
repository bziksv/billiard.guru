"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { TournamentManageView } from "@/components/admin/tournament-manage-view";
import type { MatchResultPayload } from "@/components/bracket/match-result-modal";
import { TournamentParticipantLimitNotice } from "@/components/tournament/tournament-participant-limit-notice";
import { TournamentRatingRulesSummary } from "@/components/tournament/tournament-rating-rules-summary";
import { SearchableMultiSelect, SearchableSelect } from "@/components/ui/searchable-select";
import { getDefaultBracketParticipantRules } from "@/lib/bracket-participant-rules";
import {
  countActiveTournamentSlots,
  slotsRemaining,
  validateCanAddParticipants,
} from "@/lib/tournament-participant-limit";
import {
  canFinishTournament,
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
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/validators";

interface Club {
  id: string;
  name: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  rating: number;
  phone?: string | null;
  city?: { nameRu: string; country?: { nameRu: string } | null } | null;
}

export default function AdminTournamentManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<AdminTournament | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedPlayer2, setSelectedPlayer2] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [regSource, setRegSource] = useState<"CLUB" | "SELF">("CLUB");
  const [regError, setRegError] = useState<string | null>(null);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.status === 404) {
      router.replace("/admin/tournaments");
      return;
    }
    const data = await res.json();
    setTournament(data);
  }, [id, router]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tournaments/${id}`).then((r) => r.json()),
      fetch("/api/clubs").then((r) => r.json()),
      fetch("/api/players").then((r) => r.json()),
    ]).then(([t, c, p]) => {
      if (t?.error) {
        router.replace("/admin/tournaments");
        return;
      }
      setTournament(t);
      setClubs(Array.isArray(c) ? c : []);
      setPlayers(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, [id, router]);

  const clubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.id, label: c.name })),
    [clubs],
  );

  const tournamentClubId = tournament?.clubId ?? "";
  const clubPlayerRatings = useClubPlayerRatings(tournamentClubId);

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
        tournament?.ratingSource ?? "CLUB",
      );
    });
  }, [
    playerOptions,
    registeredPlayerIds,
    tournament?.ratingMax,
    tournament?.ratingSource,
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
          tournament.ratingSource ?? "CLUB",
        );
      }),
    );
  }, [tournament?.ratingMax, tournament?.ratingSource, clubPlayerRatings, players]);

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
    router.push("/admin/tournaments");
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
    router.push("/admin/tournaments");
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
          clubId: regSource === "CLUB" ? selectedClub : undefined,
          source: regSource,
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
      if (regSource === "CLUB" && !selectedClub) {
        setRegError("Выберите клуб");
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
            clubId: regSource === "CLUB" ? selectedClub : undefined,
            source: regSource,
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
      throw new Error(data.error ?? "Не удалось удалить сетку");
    }
    await reload();
  }

  if (loading || !tournament) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  const canStart = canStartTournament(tournament);
  const canFinish = canFinishTournament(tournament);
  const confirmed = countConfirmedParticipants(tournament);
  const finishHint =
    tournament.status === "ACTIVE" && !canFinish
      ? tournament.matches.length === 0
        ? "Сначала сформируйте сетку"
        : `Разыграно ${tournament.matches.filter((m) => m.status === "FINISHED" || m.status === "WALKOVER" || m.winnerTeam).length} из ${tournament.matches.length} встреч`
      : undefined;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/tournaments"
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
              {TOURNAMENT_FORMAT_LABELS[tournament.format]} · {tournament.club.name}
              {" · "}
              {confirmed} подтверждённых
            </p>
            <TournamentRatingRulesSummary
              tournament={tournament}
              className="mt-1 text-sm text-zinc-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
                disabled={finishing || !canFinish}
                title={finishHint}
                onClick={finishTournament}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
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

      {tournament.status === "OPEN" && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
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
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={regSource === "CLUB"}
                  onChange={() => setRegSource("CLUB")}
                />
                Клуб регистрирует
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={regSource === "SELF"}
                  onChange={() => setRegSource("SELF")}
                />
                Самостоятельно
              </label>
            </div>
            {regSource === "CLUB" && (
              <SearchableSelect
                options={clubOptions}
                value={selectedClub}
                onChange={setSelectedClub}
                placeholder="Клуб"
                searchPlaceholder="Поиск клуба…"
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
                (isPair
                  ? !selectedPlayer || !selectedPlayer2
                  : selectedPlayerIds.length === 0)
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

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
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
