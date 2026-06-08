import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  getDbBackupSettings,
  isAutoBackupDue,
  runScheduledDbBackupIfDue,
} from "@/lib/db-backup-server";

function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.DB_BACKUP_CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-db-backup-cron-secret");
  return header === secret;
}

/** Вызов по cron: POST с заголовком X-Db-Backup-Cron-Secret или суперадмин. */
export async function POST(request: NextRequest) {
  try {
    if (!cronAuthorized(request)) {
      await requireSuperAdmin();
    }

    const settings = await getDbBackupSettings();
    const due = isAutoBackupDue(settings);
    const result = await runScheduledDbBackupIfDue();
    return NextResponse.json({
      ok: true,
      ran: result.ran,
      due,
      schedule: {
        autoEnabled: settings.autoEnabled,
        autoIntervalMinutes: settings.autoIntervalMinutes,
        autoHour: settings.autoHour,
        autoMinute: settings.autoMinute,
        lastAutoBackupAt: settings.lastAutoBackupAt,
      },
      backup: result.backup ?? null,
    });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    const message =
      error instanceof Error ? error.message : "Ошибка автобэкапа";
    console.error("[db-backups cron]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
