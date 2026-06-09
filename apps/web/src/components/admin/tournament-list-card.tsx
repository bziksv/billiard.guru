"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  canStartTournament,
  countConfirmedParticipants,
  countPendingApplications,
  type AdminTournament,
} from "@/lib/tournament-admin";
import { tournamentFormatDisplayLabel } from "@/lib/tournament-format-display";
import { TOURNAMENT_STATUS_LABELS } from "@/lib/validators";
import { formatAdminDate } from "@/components/admin/admin-sort-header";
import { cn } from "@/lib/cn";

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
  const tournamentHref = `/admin/tournaments/${t.id}`;
  const openPrimary = t.status === "ACTIVE" || t.matches.length > 0;

  return (
    <div className="admin-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={tournamentHref}
              className="font-semibold hover:text-emerald-400 hover:underline"
            >
              {t.name}
            </Link>
            <StatusBadge
              status={t.status}
              label={TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
            />
          </div>
          <p className="admin-text-secondary mt-1 text-sm">
            {tournamentFormatDisplayLabel(t)} · {t.club.name}
            {t.club.city?.nameRu ? ` · ${t.club.city.nameRu}` : ""}
          </p>
          {t.startsAt && (
            <p className="admin-muted mt-1 text-xs">{formatAdminDate(t.startsAt)}</p>
          )}
          <p className="admin-text-secondary mt-2 text-sm">
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
            href={tournamentHref}
            className={cn(
              "admin-btn px-4 py-2 text-sm",
              openPrimary ? "admin-btn--primary" : "admin-btn--outline",
            )}
          >
            {t.status === "ACTIVE" ? "Турнир" : "Управление"}
          </Link>
        </div>
      </div>
    </div>
  );
}
