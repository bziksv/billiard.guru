import { getTranslations } from "next-intl/server";
import { SiteCard } from "@/components/site/site-card";
import { PlayerRatingDynamicsSteps } from "@/components/site/player-rating-dynamics-steps";
import { formatPreviewDelta, formatPreviewRating } from "@/lib/rating-preview";
import { buildPlayerRatingTrace } from "@/lib/rating-player-trace-server";

function StatTile({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "up" | "down" | "neutral";
}) {
  const toneClass =
    tone === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "down"
        ? "text-rose-600 dark:text-rose-400"
        : accent
          ? "text-emerald-600 dark:text-emerald-400"
          : "";
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-3 text-center">
      <div className={`font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function RatingSparkline({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) return null;
  const w = 640;
  const h = 120;
  const padX = 8;
  const padY = 12;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(0.05, max - min);
  const coords = points.map((v, i) => {
    const x = padX + (i / (points.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - min) / span) * (h - padY * 2);
    return { x, y, v };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const area = `${line} L${coords[coords.length - 1]!.x},${h - padY} L${coords[0]!.x},${h - padY} Z`;
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;
  const rising = points[points.length - 1]! >= points[0]!;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={rising ? "rgb(16 185 129)" : "rgb(244 63 94)"}
            stopOpacity="0.35"
          />
          <stop
            offset="100%"
            stopColor={rising ? "rgb(16 185 129)" : "rgb(244 63 94)"}
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ratingFill)" />
      <path
        d={line}
        fill="none"
        stroke={rising ? "rgb(16 185 129)" : "rgb(244 63 94)"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={first.x} cy={first.y} r="3.5" fill="var(--text-muted)" />
      <circle
        cx={last.x}
        cy={last.y}
        r="4.5"
        fill={rising ? "rgb(16 185 129)" : "rgb(244 63 94)"}
      />
    </svg>
  );
}

export async function PlayerRatingDynamicsCard({
  playerId,
}: {
  playerId: string;
}) {
  const t = await getTranslations("playerRatingDynamics");
  let trace;
  try {
    trace = await buildPlayerRatingTrace(playerId);
  } catch {
    return null;
  }
  if (trace.steps.length === 0) return null;

  const delta = trace.simulatedRating - trace.seedRating;
  const peak = Math.max(
    trace.seedRating,
    ...trace.steps.map((s) => s.ratingAfter),
  );
  const points = [
    trace.seedRating,
    ...trace.steps.map((s) => s.ratingAfter),
  ];
  const deltaTone = delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
  const stepProps = trace.steps.map((s) => ({
    matchId: s.matchId,
    at: s.at,
    opponentId: s.opponentId,
    opponentIds: s.opponentIds ?? [s.opponentId],
    opponentName: s.opponentName,
    won: s.won,
    isPair: s.isPair,
    ratingBefore: s.ratingBefore,
    ratingAfter: s.ratingAfter,
    delta: s.delta,
    opponentRatingBefore: s.opponentRatingBefore,
  }));

  return (
    <section>
      <h2 className="site-section-title mb-3">{t("title")}</h2>
      <SiteCard>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label={t("base")}
            value={formatPreviewRating(trace.seedRating)}
          />
          <StatTile
            label={t("now")}
            value={formatPreviewRating(trace.currentRating)}
            accent
          />
          <StatTile
            label={t("change")}
            value={formatPreviewDelta(delta)}
            tone={deltaTone}
          />
          <StatTile label={t("peak")} value={formatPreviewRating(peak)} />
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]/60 px-3 pt-3 pb-2">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{t("chartFrom")}</span>
            <span className="font-mono tabular-nums">
              {formatPreviewRating(trace.seedRating)} →{" "}
              {formatPreviewRating(trace.simulatedRating)}
            </span>
          </div>
          <RatingSparkline points={points} className="h-28 w-full" />
        </div>

        <PlayerRatingDynamicsSteps steps={stepProps} />
      </SiteCard>
    </section>
  );
}
