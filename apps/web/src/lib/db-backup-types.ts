export type DbBackupKind = "manual" | "auto";

export type DbBackupEntry = {
  id: string;
  filename: string;
  kind: DbBackupKind;
  sizeBytes: number;
  createdAt: string;
  database: string;
};

export type DbBackupSettings = {
  autoEnabled: boolean;
  /** 0 = раз в сутки в autoHour:autoMinute; иначе каждые N минут */
  autoIntervalMinutes: number;
  autoHour: number;
  autoMinute: number;
  retainCount: number;
  lastAutoBackupAt: string | null;
  backupDir: string;
  mysqldumpAvailable: boolean;
  mysqlAvailable: boolean;
};

/** Доступные интервалы автобэкапа (минуты). */
export const INTERVAL_MINUTE_OPTIONS = [
  5, 10, 15, 30, 45, 60, 120, 180, 360, 720, 1440,
] as const;

const LEGACY_HOUR_INTERVALS = new Set([1, 2, 3, 4, 6, 8, 12, 24]);

/** Колонка auto_interval_hours в БД хранит минуты; старые значения 1–24 — часы. */
export function normalizeIntervalFromDb(stored: number): number {
  if (stored <= 0) return 0;
  if (stored <= 24 && LEGACY_HOUR_INTERVALS.has(stored)) {
    return stored * 60;
  }
  return stored;
}

export function formatIntervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes === 60) return "1 час";
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (hours === 24) return "24 часа (сутки)";
    return `${hours} ч`;
  }
  return `${minutes} мин`;
}

export function describeBackupSchedule(settings: Pick<
  DbBackupSettings,
  "autoIntervalMinutes" | "autoHour" | "autoMinute"
>): string {
  if (settings.autoIntervalMinutes > 0) {
    const m = settings.autoIntervalMinutes;
    if (m < 60) return `каждые ${m} мин`;
    if (m === 60) return "каждый час";
    if (m % 60 === 0) {
      const h = m / 60;
      if (h === 24) return "каждые сутки";
      return `каждые ${h} ч`;
    }
    return `каждые ${m} мин`;
  }
  const hh = String(settings.autoHour).padStart(2, "0");
  const mm = String(settings.autoMinute).padStart(2, "0");
  return `раз в сутки в ${hh}:${mm}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}
