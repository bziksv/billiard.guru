import type { ReactNode } from "react";
import { ClubBookingScrollButton } from "@/components/site/club-booking-scroll-button";
import { ClubScheduleDisplay } from "@/components/site/club-schedule-display";
import { SiteCard } from "@/components/site/site-card";
import { PhoneLink, TelegramLink } from "@/lib/contact-links";
import {
  clubTableCountsEntries,
  clubTableCountsTotal,
  parseClubTableCounts,
} from "@/lib/club-table-formats";

type ClubInfoPanelProps = {
  phone: string;
  phoneCountryName?: string;
  telegramUsername?: string | null;
  workingHours?: string | null;
  weeklyHours?: unknown;
  gamePrice?: string | null;
  priceTiers?: unknown;
  tableCount?: number | null;
  tableCounts?: unknown;
  bookingEnabled?: boolean;
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
}: {
  counts: ReturnType<typeof parseClubTableCounts>;
}) {
  const entries = clubTableCountsEntries(counts);
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

export function ClubInfoPanel({
  phone,
  phoneCountryName,
  telegramUsername,
  workingHours,
  weeklyHours,
  gamePrice,
  priceTiers,
  tableCount,
  tableCounts: tableCountsRaw,
  bookingEnabled,
}: ClubInfoPanelProps) {
  const tableCounts = parseClubTableCounts(tableCountsRaw);
  const countsTotal = clubTableCountsTotal(tableCounts);
  const total = countsTotal > 0 ? countsTotal : (tableCount ?? 0);
  const hasTables = total > 0 || clubTableCountsEntries(tableCounts).length > 0;

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

      {bookingEnabled && <ClubBookingScrollButton />}

      {hasTables && (
        <PanelSection title="Столы">
          {total > 0 && (
            <p className="club-info-highlight">
              {total} {tableWord(total)}
            </p>
          )}
          <ClubTableFormatsList counts={tableCounts} />
        </PanelSection>
      )}

      <PanelSection title="Режим работы и цены">
        <ClubScheduleDisplay
          weeklyHours={weeklyHours}
          workingHours={workingHours}
          priceTiers={priceTiers}
          gamePrice={gamePrice}
        />
      </PanelSection>
    </SiteCard>
  );
}

function tableWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "столов";
  if (mod10 === 1) return "стол";
  if (mod10 >= 2 && mod10 <= 4) return "стола";
  return "столов";
}
