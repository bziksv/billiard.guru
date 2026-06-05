import { NextResponse } from "next/server";
import { authErrorResponse, requireSession } from "@/lib/auth";
import { getTournamentDefaults } from "@/lib/tournament-defaults-server";

export async function GET() {
  try {
    await requireSession();
    const defaults = await getTournamentDefaults();
    return NextResponse.json(defaults);
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
