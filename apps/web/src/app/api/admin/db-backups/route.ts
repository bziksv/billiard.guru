import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin, requireWritableSuperAdmin } from "@/lib/auth";
import {
  createDbBackup,
  getDbBackupSettings,
  listDbBackups,
} from "@/lib/db-backup-server";

export async function GET() {
  try {
    await requireSuperAdmin();
    const [backups, settings] = await Promise.all([
      listDbBackups(),
      getDbBackupSettings(),
    ]);
    return NextResponse.json({ backups, settings });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    console.error("[db-backups GET]", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireWritableSuperAdmin();
    const backup = await createDbBackup("manual");
    const [backups, settings] = await Promise.all([
      listDbBackups(),
      getDbBackupSettings(),
    ]);
    return NextResponse.json({ ok: true, backup, backups, settings });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    console.error("[db-backups POST]", error);
    return NextResponse.json({ error: "Не удалось создать бэкап" }, { status: 500 });
  }
}
