import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { deleteDbBackup, listDbBackups } from "@/lib/db-backup-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    await deleteDbBackup(id);
    const backups = await listDbBackups();
    return NextResponse.json({ ok: true, backups });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    const message =
      error instanceof Error ? error.message : "Не удалось удалить бэкап";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
