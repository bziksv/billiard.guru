"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { TournamentManageView } from "@/components/admin/tournament-manage-view";
import { TournamentRatingRulesSummary } from "@/components/tournament/tournament-rating-rules-summary";
import { getBracketFormat } from "@/lib/bracket-formats/catalog";
import { countConfirmedParticipants, type AdminTournament } from "@/lib/tournament-admin";
import { useClubPlayerRatings } from "@/hooks/use-club-player-ratings";
import { useAdminTournamentBracketActions } from "@/lib/use-admin-tournament-bracket";
import { bracketAdminStatusLabel } from "@/lib/tournament-bracket-admin";
import {
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/lib/validators";

interface Club {
  id: string;
  name: string;
}

export default function AdminBracketTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<AdminTournament | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentationOpen, setPresentationOpen] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${id}`);
    if (res.status === 404) {
      router.replace("/admin/brackets");
      return;
    }
    const data = await res.json();
    setTournament(data);
  }, [id, router]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tournaments/${id}`).then((r) => r.json()),
      fetch("/api/clubs").then((r) => r.json()),
    ]).then(([t, c]) => {
      if (t?.error) {
        router.replace("/admin/brackets");
        return;
      }
      setTournament(t);
      setClubs(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, [id, router]);

  const {
    bracketLoading,
    generateBracket,
    saveMatchResult,
    cancelMatchResult,
    resetAllMatches,
    regenerateBracketGrid,
    deleteBracketGrid,
  } = useAdminTournamentBracketActions(id, reload);

  const clubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.id, label: c.name })),
    [clubs],
  );
  const clubPlayerRatings = useClubPlayerRatings(tournament?.clubId ?? "");

  const noop = useCallback(async () => {}, []);

  const handleDeleteBracket = useCallback(async () => {
    await deleteBracketGrid();
    const formatCode = tournament?.format;
    const def = formatCode ? getBracketFormat(formatCode) : null;
    router.push(def ? `/admin/brackets/formats/${def.code}` : "/admin/brackets");
  }, [deleteBracketGrid, router, tournament?.format]);

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
    router.push("/admin/brackets");
  }

  if (loading || !tournament) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  const confirmed = countConfirmedParticipants(tournament);
  const formatDef = getBracketFormat(tournament.format);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={
            formatDef
              ? `/admin/brackets/formats/${formatDef.code}`
              : "/admin/brackets"
          }
          className="text-sm text-emerald-400 hover:underline"
        >
          ← {formatDef ? formatDef.adminLabel : "Сетки"}
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
              <StatusBadge
                status={tournament.status}
                label={
                  TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status
                }
              />
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {TOURNAMENT_FORMAT_LABELS[tournament.format]} · {tournament.club.name}
              {" · "}
              {confirmed} подтверждённых · {bracketAdminStatusLabel(tournament)}
            </p>
            <TournamentRatingRulesSummary
              tournament={tournament}
              className="mt-1 text-sm text-zinc-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/tournaments/${tournament.id}`} className="admin-btn-secondary">
              Участники и турнир
            </Link>
            {tournament.matches.length > 0 && (
              <Link
                href={`/tournaments/${tournament.id}/bracket`}
                className="admin-btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Сетка на сайте
              </Link>
            )}
            <button
              type="button"
              onClick={() => setPresentationOpen(true)}
              className="admin-btn-secondary"
            >
              На весь экран
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 px-6 pb-6 pt-4">
        <TournamentManageView
          tournament={tournament}
          clubOptions={clubOptions}
          playerOptions={[]}
          clubPlayerRatings={clubPlayerRatings}
          bracketLoading={bracketLoading}
          embedded
          initialTab="bracket"
          presentationOpen={presentationOpen}
          onPresentationOpenChange={setPresentationOpen}
          showTabBarFullscreenButton={false}
          onConfirmRegistration={noop}
          onRejectRegistration={noop}
          onCancelRegistration={noop}
          onConfirmTeam={noop}
          onGenerateBracket={generateBracket}
          onResetAllMatches={resetAllMatches}
          onRegenerateBracket={regenerateBracketGrid}
          onDeleteBracket={handleDeleteBracket}
          onSaveMatchResult={saveMatchResult}
          onCancelMatchResult={cancelMatchResult}
          onUpdated={reload}
          onDelete={deleteTournament}
        />
      </section>
    </div>
  );
}
