import { describeBackupSchedule, type DbBackupSettings } from "@/lib/db-backup-types";

export type DbBackupCronScheduleInput = Pick<
  DbBackupSettings,
  "autoEnabled" | "autoIntervalMinutes" | "autoHour" | "autoMinute"
>;

/** Как часто дергать cron, чтобы API успевал поймать интервал автобэкапа. */
export function recommendCronPollMinutes(intervalMinutes: number): number {
  if (intervalMinutes <= 15) return 5;
  if (intervalMinutes <= 30) return 10;
  if (intervalMinutes <= 60) return 15;
  if (intervalMinutes <= 180) return 30;
  if (intervalMinutes <= 720) return 60;
  return 120;
}

export function cronExpressionFromPollMinutes(pollMinutes: number): string {
  if (pollMinutes >= 60 && pollMinutes % 60 === 0) {
    const hours = pollMinutes / 60;
    if (hours === 24) return "0 3 * * *";
    if (hours === 1) return "0 * * * *";
    return `0 */${hours} * * *`;
  }
  return `*/${pollMinutes} * * * *`;
}

export function recommendCronExpression(input: DbBackupCronScheduleInput): string {
  if (!input.autoEnabled) {
    return "—";
  }
  if (input.autoIntervalMinutes > 0) {
    return cronExpressionFromPollMinutes(
      recommendCronPollMinutes(input.autoIntervalMinutes),
    );
  }
  const minute = Math.min(59, Math.max(0, input.autoMinute));
  const hour = Math.min(23, Math.max(0, input.autoHour));
  return `${minute} ${hour} * * *`;
}

export function buildCronLine(
  cronExpression: string,
  cronScriptPath: string,
  logPath: string,
): string {
  if (cronExpression === "—") {
    return `# Автобэкап выключен — строку в crontab не добавляйте`;
  }
  return `${cronExpression} ${cronScriptPath} >> ${logPath} 2>&1`;
}

export function cronSetupNote(input: DbBackupCronScheduleInput): string {
  if (!input.autoEnabled) {
    return "Включите автобэкап и сохраните расписание — здесь появится строка для crontab.";
  }
  if (input.autoIntervalMinutes > 0) {
    const poll = recommendCronPollMinutes(input.autoIntervalMinutes);
    return `Cron опрашивает API каждые ${poll} мин; бэкап создаётся ${describeBackupSchedule(input)} (если прошло достаточно времени с прошлого автобэкапа).`;
  }
  return `Cron запускается ${describeBackupSchedule(input)} по времени сервера.`;
}

export type DbBackupCronSetup = {
  repoRoot: string;
  cronScriptPath: string;
  logPath: string;
  cronExpression: string;
  cronLine: string;
  cronSecretConfigured: boolean;
  note: string;
  testCommand: string;
};

export function buildDbBackupCronSetup(
  paths: { repoRoot: string; cronScriptPath: string; logPath: string },
  schedule: DbBackupCronScheduleInput,
  cronSecretConfigured: boolean,
): DbBackupCronSetup {
  const cronExpression = recommendCronExpression(schedule);
  return {
    ...paths,
    cronExpression,
    cronLine: buildCronLine(cronExpression, paths.cronScriptPath, paths.logPath),
    cronSecretConfigured,
    note: cronSetupNote(schedule),
    testCommand: paths.cronScriptPath,
  };
}
