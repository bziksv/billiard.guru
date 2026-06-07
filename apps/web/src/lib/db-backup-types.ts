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
  /** 0 = раз в сутки в autoHour:autoMinute; иначе каждые N часов */
  autoIntervalHours: number;
  autoHour: number;
  autoMinute: number;
  retainCount: number;
  lastAutoBackupAt: string | null;
  backupDir: string;
  mysqldumpAvailable: boolean;
  mysqlAvailable: boolean;
};

const INTERVAL_HOUR_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24] as const;

export function describeBackupSchedule(settings: Pick<
  DbBackupSettings,
  "autoIntervalHours" | "autoHour" | "autoMinute"
>): string {
  if (settings.autoIntervalHours > 0) {
    const h = settings.autoIntervalHours;
    if (h === 1) return "каждый час";
    if (h === 24) return "каждые сутки";
    return `каждые ${h} ч`;
  }
  const hh = String(settings.autoHour).padStart(2, "0");
  const mm = String(settings.autoMinute).padStart(2, "0");
  return `раз в сутки в ${hh}:${mm}`;
}

export { INTERVAL_HOUR_OPTIONS };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}
