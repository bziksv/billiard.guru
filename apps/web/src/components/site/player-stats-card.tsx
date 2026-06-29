import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteCard } from "@/components/site/site-card";
import type { PlayerMatchStats, RivalStat } from "@/lib/player-stats";
import { disciplineGroupLabel } from "@/lib/tournament-discipline";
import { localizedPlayerName } from "@/lib/latin-names";
import type { AppLocale } from "@/i18n/routing";

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-3 text-center">
      <div
        className={`font-mono text-2xl font-semibold ${
          accent ? "text-emerald-500 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

export async function PlayerStatsCard({ stats }: { stats: PlayerMatchStats }) {
  if (stats.played === 0) return null;
  const t = await getTranslations("playerStats");
  const locale = (await getLocale()) === "en" ? "en" : "ru";

  const winPct = stats.winRate != null ? Math.round(stats.winRate * 100) : null;
  const winPctLabel = winPct != null ? `${winPct}%` : "—";

  let avgLabel = "—";
  if (stats.avgDurationMin != null) {
    const min = stats.avgDurationMin;
    avgLabel =
      min < 60
        ? t("minutesShort", { count: min })
        : t("hoursMinutes", { hours: Math.floor(min / 60), minutes: min % 60 });
  }

  return (
    <section>
      <h2 className="site-section-title mb-3">{t("title")}</h2>
      <SiteCard>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label={t("winRate")} value={winPctLabel} accent />
          <StatTile label={t("games")} value={String(stats.played)} />
          <StatTile label={t("record")} value={`${stats.wins} / ${stats.losses}`} />
          <StatTile
            label={t("tournaments")}
            value={String(stats.tournamentsPlayed)}
          />
          <StatTile label={t("avgDuration")} value={avgLabel} />
        </div>

        {winPct != null && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${winPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-[var(--text-muted)]">
              <span>{t("winsShort", { count: stats.wins })}</span>
              <span>{t("lossesShort", { count: stats.losses })}</span>
            </div>
          </div>
        )}

        {stats.pairGames > 0 && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {t("pairGames", { count: stats.pairGames })}
          </p>
        )}

        {stats.byDiscipline.length > 0 && (
          <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
            <h3 className="mb-2 text-sm font-semibold">{t("byDiscipline")}</h3>
            <ul className="space-y-2.5">
              {stats.byDiscipline.map((d) => {
                const pct = d.winRate != null ? Math.round(d.winRate * 100) : 0;
                const label =
                  disciplineGroupLabel(d.discipline, d.gameType, locale) ??
                  d.discipline;
                return (
                  <li key={d.key}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{label}</span>
                      <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                        {d.played} · {d.wins}/{d.losses} ·{" "}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.winRate != null ? `${pct}%` : "—"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(stats.topWins.length > 0 || stats.topLosses.length > 0) && (
          <div className="mt-5 grid gap-5 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2">
            {stats.topWins.length > 0 && (
              <RivalList
                title={t("rivalsBeat")}
                rivals={stats.topWins}
                tone="win"
                locale={locale}
                gamesLabel={(count) => t("gamesShort", { count })}
              />
            )}
            {stats.topLosses.length > 0 && (
              <RivalList
                title={t("rivalsLose")}
                rivals={stats.topLosses}
                tone="loss"
                locale={locale}
                gamesLabel={(count) => t("gamesShort", { count })}
              />
            )}
          </div>
        )}
      </SiteCard>
    </section>
  );
}

function RivalList({
  title,
  rivals,
  tone,
  locale,
  gamesLabel,
}: {
  title: string;
  rivals: RivalStat[];
  tone: "win" | "loss";
  locale: AppLocale;
  gamesLabel: (count: number) => string;
}) {
  const accent =
    tone === "win"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2">
        {rivals.map((r) => {
          const pct = r.winRate != null ? Math.round(r.winRate * 100) : 0;
          return (
            <li key={r.playerId} className="text-sm">
              <div className="flex items-center justify-between gap-3">
              <Link
                href={`/players/${r.playerId}`}
                className="truncate font-medium hover:underline"
              >
                {localizedPlayerName(locale, r)}
              </Link>
                <span className={`shrink-0 font-semibold tabular-nums ${accent}`}>
                  {pct}%
                </span>
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-[var(--text-muted)]">
                {gamesLabel(r.played)} · +{r.wins} / −{r.losses}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
