export type CalendarBooking = {
  id: string;
  tableFormat: string;
  floorItemId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  kind: string;
  playerNote: string | null;
  clubNote: string | null;
  guestName: string | null;
  guestPhone: string | null;
  dayKey: string;
  tableRowId: string;
  floorTableLabel: string | null;
  displayName: string;
  displayPhone: string;
  player: { id: string; firstName: string; lastName: string; phone: string } | null;
};

export type CalendarTable = {
  id: string;
  label: string;
  tableFormat: string;
};

export type CalendarPayload = {
  from: string;
  days: string[];
  closedDays: string[];
  tables: CalendarTable[];
  bookings: CalendarBooking[];
  history: CalendarBooking[];
  stats: {
    pending: number;
    confirmedToday: number;
    confirmedInRange: number;
    tablesCount: number;
    blocksCount: number;
    utilizationPercent: number;
    peakHourLabel: string;
  };
  bookingAdvanceDays: number;
  slotMinutes: number;
  weeklyHours: unknown;
  workingHours: string | null;
  hasFloorPlan: boolean;
};

export type StatusFilter = "all" | "pending" | "confirmed" | "block";
export type ViewMode = "week" | "day" | "today";
