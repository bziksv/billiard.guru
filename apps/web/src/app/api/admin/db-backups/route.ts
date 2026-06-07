import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
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
    await requireSuperAdmin();
    const backup = await createDbBackup("manual");
    const [backups, settings] = await Promise.all([
      listDbBackups(),
      getDbBackupSettings(),
    ]);
    return NextResponse.json({ ok: true, backup, backups, settings });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    const message =
      error instanceof Error ? error.message : "Не удалось создать бэкап";
    console.error("[db-backups POST]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
