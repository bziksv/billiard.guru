"use client";

import { useMemo } from "react";
import {
  findActivePriceTierIndex,
  getClubOpenStatus,
  hoursFootnote,
  parsePriceTiers,
  priceTierDaysLabel,
  resolveWeeklyHours,
  scheduleRows,
  type PriceTier,
} from "@/lib/club-schedule";

type ClubScheduleDisplayProps = {
  weeklyHours?: unknown;
  workingHours?: string | null;
  priceTiers?: unknown;
  gamePrice?: string | null;
  timeZone?: string;
};

function formatTimeRange(tier: PriceTier): string | null {
  if (tier.timeFrom && tier.timeTo) {
    return `${tier.timeFrom} – ${tier.timeTo}`;
  }
  if (tier.timeFrom) return `с ${tier.timeFrom}`;
  if (tier.timeTo) return `до ${tier.timeTo}`;
  return null;
}

export function ClubScheduleDisplay({
  weeklyHours,
  workingHours,
  priceTiers: priceTiersRaw,
  gamePrice,
  timeZone = "Europe/Moscow",
}: ClubScheduleDisplayProps) {
  const now = useMemo(() => new Date(), []);
  const slots = useMemo(
    () => resolveWeeklyHours(weeklyHours, workingHours),
    [weeklyHours, workingHours],
  );
  const tiers = useMemo(() => parsePriceTiers(priceTiersRaw), [priceTiersRaw]);
  const status = useMemo(
    () => (slots.length > 0 ? getClubOpenStatus(slots, now, timeZone) : null),
    [slots, now, timeZone],
  );
  const rows = useMemo(
    () => (status ? scheduleRows(slots, status.today) : []),
    [slots, status],
  );
  const footnote = hoursFootnote(workingHours);
  const minutesNow = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  }, [now, timeZone]);

  const activeTierIndex = useMemo(
    () =>
      status != null ? findActivePriceTierIndex(tiers, status.today, minutesNow) : null,
    [tiers, status, minutesNow],
  );

  const hasPrices = tiers.length > 0 || Boolean(gamePrice?.trim());
  const hasSchedule = rows.length > 0;

  if (!hasSchedule && !hasPrices) {
    return <p className="home-card-muted text-sm">График уточняйте у клуба.</p>;
  }

  return (
    <div className="club-schedule">
      {status && (
        <div
          className={
            status.isOpen ? "club-schedule-status club-schedule-status--open" : "club-schedule-status"
          }
        >
          <p className="club-schedule-status-day">
            Сегодня · {status.todayLabel}
          </p>
          <p className="club-schedule-status-message">{status.message}</p>
          {status.detail && <p className="club-schedule-status-detail">{status.detail}</p>}
        </div>
      )}

      {hasSchedule && (
        <ul className="club-schedule-hours">
          {rows.map((row) => (
            <li
              key={row.key}
              className={row.isToday ? "club-schedule-hours-row club-schedule-hours-row--today" : "club-schedule-hours-row"}
            >
              <span className="club-schedule-hours-days">
                {row.daysLabel}
                {row.isToday && <span className="club-schedule-today-badge">сегодня</span>}
              </span>
              <span className="club-schedule-hours-time">{row.hoursLabel}</span>
            </li>
          ))}
        </ul>
      )}

      {footnote && <p className="club-schedule-footnote">{footnote}</p>}

      {hasPrices && (
        <div className="club-schedule-prices">
          <p className="club-schedule-prices-title">Стоимость</p>
          {tiers.length > 0 ? (
            <ul className="club-price-tiers">
              {tiers.map((tier, index) => {
                const active = activeTierIndex === index;
                const timeLabel = formatTimeRange(tier);
                return (
                  <li
                    key={`${tier.label}-${index}`}
                    className={active ? "club-price-tier club-price-tier--active" : "club-price-tier"}
                  >
                    <div className="club-price-tier-head">
                      <span className="club-price-tier-label">{tier.label}</span>
                      {active && <span className="club-schedule-today-badge">сейчас</span>}
                    </div>
                    <p className="club-price-tier-meta">
                      {[priceTierDaysLabel(tier.days), timeLabel].filter(Boolean).join(" · ")}
                    </p>
                    <p className="club-price-tier-price">{tier.price}</p>
                    {tier.note && <p className="club-price-tier-note">{tier.note}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            gamePrice?.trim() && (
              <p className="home-card-body whitespace-pre-wrap text-sm leading-relaxed">{gamePrice.trim()}</p>
            )
          )}
        </div>
      )}
    </div>
  );
}
