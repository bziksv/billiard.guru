"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { ClubBookingScrollButton } from "@/components/site/club-booking-scroll-button";
import { ClubTelegramBookingLink } from "@/components/site/club-telegram-booking-link";
import { ClubScheduleDisplay } from "@/components/site/club-schedule-display";
import { SiteCard } from "@/components/site/site-card";
import { PhoneLink, TelegramLink } from "@/lib/contact-links";
import {
  clubTableCountsEntries,
  clubTableCountsTotal,
  parseClubTableCounts,
} from "@/lib/club-table-formats";
import { resolveLocalizedPriceTiers } from "@/lib/localized-db-text";
import { priceTiersToJson } from "@/lib/club-schedule";

type ClubInfoPanelProps = {
  phone: string;
  phoneCountryName?: string;
  telegramUsername?: string | null;
  workingHours?: string | null;
  workingHoursEn?: string | null;
  weeklyHours?: unknown;
  gamePrice?: string | null;
  gamePriceEn?: string | null;
  priceTiers?: unknown;
  priceTiersEn?: unknown;
  tableCount?: number | null;
  tableCounts?: unknown;
  bookingEnabled?: boolean;
  clubId?: string;
};

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="club-info-section">
      <h3 className="club-info-section-title">{title}</h3>
      <div className="club-info-section-body">{children}</div>
    </div>
  );
}

function ClubTableFormatsList({
  counts,
  locale,
}: {
  counts: ReturnType<typeof parseClubTableCounts>;
  locale: AppLocale;
}) {
  const entries = clubTableCountsEntries(counts, locale);
  if (entries.length === 0) return null;

  return (
    <ul className="club-table-formats-list">
      {entries.map((entry) => (
        <li key={entry.id} className="club-table-formats-item">
          <span className="club-table-formats-label">{entry.label}</span>
          <span className="club-table-formats-count">{entry.count}</span>
        </li>
      ))}
    </ul>
  );
}

function tableWord(n: number, t: ReturnType<typeof useTranslations<"clubPanel">>): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return t("tableMany");
  if (mod10 === 1) return t("tableOne");
  if (mod10 >= 2 && mod10 <= 4) return t("tableFew");
  return t("tableMany");
}

export function ClubInfoPanel({
  phone,
  phoneCountryName,
  telegramUsername,
  workingHours,
  workingHoursEn,
  weeklyHours,
  gamePrice,
  gamePriceEn,
  priceTiers,
  priceTiersEn,
  tableCount,
  tableCounts: tableCountsRaw,
  bookingEnabled,
  clubId,
}: ClubInfoPanelProps) {
  const t = useTranslations("clubPanel");
  const locale = useLocale() as AppLocale;
  const tableCounts = parseClubTableCounts(tableCountsRaw);
  const countsTotal = clubTableCountsTotal(tableCounts);
  const total = countsTotal > 0 ? countsTotal : (tableCount ?? 0);
  const hasTables = total > 0 || clubTableCountsEntries(tableCounts, locale).length > 0;
  const localizedPriceTiers = useMemo(
    () => priceTiersToJson(resolveLocalizedPriceTiers(locale, priceTiers, priceTiersEn)),
    [locale, priceTiers, priceTiersEn],
  );

  return (
    <SiteCard className="club-info-panel lg:sticky lg:top-24">
      {phone && (
        <div className="club-info-phone">
          <PhoneLink
            phone={phone}
            countryName={phoneCountryName}
            className="club-info-phone-link"
          />
        </div>
      )}

      {telegramUsername && (
        <div className="club-info-telegram">
          <TelegramLink
            username={telegramUsername}
            className="club-info-telegram-link"
            showIcon
          />
        </div>
      )}

      {bookingEnabled && (
        <>
          <ClubBookingScrollButton />
          {clubId && (
            <ClubTelegramBookingLink clubId={clubId} compact bookLabel={t("bookTelegram")} />
          )}
        </>
      )}

      {hasTables && (
        <PanelSection title={t("tables")}>
          {total > 0 && (
            <p className="club-info-highlight">
              {total} {tableWord(total, t)}
            </p>
          )}
          <ClubTableFormatsList counts={tableCounts} locale={locale} />
        </PanelSection>
      )}

      <PanelSection title={t("scheduleAndPrices")}>
        <ClubScheduleDisplay
          weeklyHours={weeklyHours}
          workingHours={workingHours}
          workingHoursEn={workingHoursEn}
          priceTiers={localizedPriceTiers}
          gamePrice={gamePrice}
          gamePriceEn={gamePriceEn}
        />
      </PanelSection>
    </SiteCard>
  );
}
