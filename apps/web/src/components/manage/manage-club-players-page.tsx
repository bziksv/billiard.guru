"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { ClubPlayerRatingsPanel } from "@/components/admin/club-player-ratings";
import { ManagePlayerRegisterForm } from "@/components/manage/manage-player-register-form";

export function ManageClubPlayersPage({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleLoaded = useCallback(() => setLoaded(true), []);
  const handlePlayerRegistered = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Игроки клуба</h1>
          <p className="admin-muted mt-1 text-sm">{clubName}</p>
        </div>
        <SectionLogsButton section="players" clubId={clubId} />
      </div>
      {loaded && (
        <p className="text-sm">
          <Link href="#register" className="text-emerald-400 hover:underline">
            Зарегистрировать нового игрока →
          </Link>
        </p>
      )}

      <ClubPlayerRatingsPanel
        clubId={clubId}
        clubName={clubName}
        variant="manage"
        refreshKey={refreshKey}
        onLoaded={handleLoaded}
      />

      {loaded && (
        <section
          id="register"
          className="max-w-2xl scroll-mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <h2 className="text-lg font-semibold">Регистрация нового игрока</h2>
          <p className="text-sm text-zinc-500">
            Новый игрок сразу попадёт в список игроков клуба с указанным рейтингом.
          </p>
          <ManagePlayerRegisterForm
            clubId={clubId}
            onRegistered={handlePlayerRegistered}
          />
        </section>
      )}
    </div>
  );
}
