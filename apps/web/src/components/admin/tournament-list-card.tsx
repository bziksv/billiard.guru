"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  canStartTournament,
  countConfirmedParticipants,
  countPendingApplications,
  type AdminTournament,
} from "@/lib/tournament-admin";
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/validators";
import { formatAdminDate } from "@/components/admin/admin-sort-header";

export function TournamentListCard({
  tournament: t,
  starting,
  onStart,
}: {
  tournament: AdminTournament;
  starting: boolean;
  onStart: (id: string) => void;
}) {
  const confirmed = countConfirmedParticipants(t);
  const pending = countPendingApplications(t);
  const canStart = canStartTournament(t);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{t.name}</h3>
            <StatusBadge
              status={t.status}
              label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
            />
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {TOURNAMENT_FORMAT_LABELS[t.format]} · {t.club.name}
            {t.club.city?.nameRu ? ` · ${t.club.city.nameRu}` : ""}
          </p>
          {t.startsAt && (
            <p className="mt-1 text-xs text-zinc-500">{formatAdminDate(t.startsAt)}</p>
          )}
          <p className="mt-2 text-sm text-zinc-300">
            {confirmed} подтверждённых
            {pending > 0 ? ` · ${pending} заявок` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canStart && (
            <button
              type="button"
              disabled={starting}
              onClick={() => onStart(t.id)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {starting ? "Запуск…" : "Начать турнир"}
            </button>
          )}
          <Link
            href={`/admin/tournaments/${t.id}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600 hover:text-emerald-300"
          >
            {t.status === "ACTIVE" ? "Ведение" : "Управление"}
          </Link>
        </div>
      </div>
    </div>
  );
}
