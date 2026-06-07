import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { getDbBackupFilePath } from "@/lib/db-backup-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const filePath = await getDbBackupFilePath(id);
    const body = await readFile(filePath);
    const filename = filePath.split("/").pop() ?? `${id}.sql`;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    const message =
      error instanceof Error ? error.message : "Файл бэкапа не найден";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
