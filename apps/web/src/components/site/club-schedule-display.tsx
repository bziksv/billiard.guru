"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import {
  findActivePriceTierIndex,
  formatPriceTierTimeRange,
  getClubOpenStatus,
  hoursFootnote,
  parsePriceTiers,
  priceTierDaysLabel,
  resolveWeeklyHours,
  scheduleRows,
  type PriceTier,
  type ScheduleLocale,
} from "@/lib/club-schedule";

type ClubScheduleDisplayProps = {
  weeklyHours?: unknown;
  workingHours?: string | null;
  workingHoursEn?: string | null;
  priceTiers?: unknown;
  gamePrice?: string | null;
  gamePriceEn?: string | null;
  timeZone?: string;
};

export function ClubScheduleDisplay({
  weeklyHours,
  workingHours,
  workingHoursEn,
  priceTiers: priceTiersRaw,
  gamePrice,
  gamePriceEn,
  timeZone = "Europe/Moscow",
}: ClubScheduleDisplayProps) {
  const t = useTranslations("clubSchedule");
  const appLocale = useLocale() as AppLocale;
  const scheduleLocale: ScheduleLocale = appLocale === "en" ? "en" : "ru";

  const now = useMemo(() => new Date(), []);
  const slots = useMemo(
    () => resolveWeeklyHours(weeklyHours, workingHours),
    [weeklyHours, workingHours],
  );
  const tiers = useMemo(() => parsePriceTiers(priceTiersRaw), [priceTiersRaw]);
  const status = useMemo(
    () => (slots.length > 0 ? getClubOpenStatus(slots, now, timeZone, scheduleLocale) : null),
    [slots, now, timeZone, scheduleLocale],
  );
  const rows = useMemo(
    () => (status ? scheduleRows(slots, status.today, scheduleLocale) : []),
    [slots, status, scheduleLocale],
  );
  const workingHoursForFootnote = resolveLocalizedField(
    appLocale,
    workingHours ?? "",
    workingHoursEn,
  );
  const footnote = hoursFootnote(workingHoursForFootnote);
  const displayGamePrice = resolveLocalizedField(appLocale, gamePrice ?? "", gamePriceEn);

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

  const hasPrices = tiers.length > 0 || Boolean(displayGamePrice?.trim());
  const hasSchedule = rows.length > 0;

  if (!hasSchedule && !hasPrices) {
    return <p className="home-card-muted text-sm">{t("contactClub")}</p>;
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
            {t("todayPrefix", { day: status.todayLabel })}
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
                {row.isToday && <span className="club-schedule-today-badge">{t("todayBadge")}</span>}
              </span>
              <span className="club-schedule-hours-time">{row.hoursLabel}</span>
            </li>
          ))}
        </ul>
      )}

      {footnote && <p className="club-schedule-footnote">{footnote}</p>}

      {hasPrices && (
        <div className="club-schedule-prices">
          <p className="club-schedule-prices-title">{t("costTitle")}</p>
          {tiers.length > 0 ? (
            <ul className="club-price-tiers">
              {tiers.map((tier, index) => (
                <PriceTierRow
                  key={`${tier.label}-${index}`}
                  tier={tier}
                  active={activeTierIndex === index}
                  locale={scheduleLocale}
                  nowBadge={t("nowBadge")}
                />
              ))}
            </ul>
          ) : (
            displayGamePrice?.trim() && (
              <p className="home-card-body whitespace-pre-wrap text-sm leading-relaxed">
                {displayGamePrice.trim()}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

function PriceTierRow({
  tier,
  active,
  locale,
  nowBadge,
}: {
  tier: PriceTier;
  active: boolean;
  locale: ScheduleLocale;
  nowBadge: string;
}) {
  const timeLabel = formatPriceTierTimeRange(tier, locale);
  return (
    <li className={active ? "club-price-tier club-price-tier--active" : "club-price-tier"}>
      <div className="club-price-tier-head">
        <span className="club-price-tier-label">{tier.label}</span>
        {active && <span className="club-schedule-today-badge">{nowBadge}</span>}
      </div>
      <p className="club-price-tier-meta">
        {[priceTierDaysLabel(tier.days, locale), timeLabel].filter(Boolean).join(" · ")}
      </p>
      <p className="club-price-tier-price">{tier.price}</p>
      {tier.note && <p className="club-price-tier-note">{tier.note}</p>}
    </li>
  );
}
