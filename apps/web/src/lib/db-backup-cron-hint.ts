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

/** PHP на shared-хостинге Beget для cron (не bash-скрипт). */
export const BEGET_CRON_PHP_BIN = "/usr/local/bin/php8.2";

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

/** Строка crontab для панели Beget (cron через php8.2). */
export function buildBegetCronLine(
  cronExpression: string,
  phpScriptPath: string,
  logPath: string,
): string {
  if (cronExpression === "—") {
    return `# Автобэкап выключен — строку в crontab не добавляйте`;
  }
  return `${cronExpression} ${BEGET_CRON_PHP_BIN} ${phpScriptPath} >> ${logPath} 2>&1`;
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
  envFilePath: string;
  /** Bash-скрипт (SSH / VPS). */
  cronScriptPath: string;
  /** PHP-обёртка для cron на Beget. */
  cronPhpScriptPath: string;
  logPath: string;
  cronExpression: string;
  /** Bash: прямой запуск .sh */
  cronLine: string;
  /** Beget: php8.2 + db-backup-cron.php */
  cronLineBeget: string;
  cronSecretConfigured: boolean;
  /** Строка для apps/web/.env, если секрет ещё не задан */
  envSecretLine: string;
  generateSecretCommand: string;
  note: string;
  testCommand: string;
  testCommandBeget: string;
  scriptExists: boolean;
  phpScriptExists: boolean;
};

export function buildDbBackupCronSetup(
  paths: {
    repoRoot: string;
    envFilePath: string;
    cronScriptPath: string;
    cronPhpScriptPath: string;
    logPath: string;
    scriptExists: boolean;
    phpScriptExists: boolean;
  },
  schedule: DbBackupCronScheduleInput,
  cronSecretConfigured: boolean,
): DbBackupCronSetup {
  const cronExpression = recommendCronExpression(schedule);
  return {
    repoRoot: paths.repoRoot,
    envFilePath: paths.envFilePath,
    cronScriptPath: paths.cronScriptPath,
    cronPhpScriptPath: paths.cronPhpScriptPath,
    logPath: paths.logPath,
    cronExpression,
    cronLine: buildCronLine(cronExpression, paths.cronScriptPath, paths.logPath),
    cronLineBeget: buildBegetCronLine(
      cronExpression,
      paths.cronPhpScriptPath,
      paths.logPath,
    ),
    cronSecretConfigured,
    envSecretLine: "DB_BACKUP_CRON_SECRET=замените-на-длинную-случайную-строку",
    generateSecretCommand: "openssl rand -hex 32",
    note: cronSetupNote(schedule),
    testCommand: paths.cronScriptPath,
    testCommandBeget: `${BEGET_CRON_PHP_BIN} ${paths.cronPhpScriptPath}`,
    scriptExists: paths.scriptExists,
    phpScriptExists: paths.phpScriptExists,
  };
}
