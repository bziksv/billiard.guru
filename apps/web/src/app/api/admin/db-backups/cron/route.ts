import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
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
  if (!header) return false;
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
    console.error("[db-backups cron]", error);
    return NextResponse.json({ error: "Ошибка автобэкапа" }, { status: 500 });
  }
}
