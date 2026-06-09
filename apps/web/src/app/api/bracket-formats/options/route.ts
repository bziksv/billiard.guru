import { NextResponse } from "next/server";
import { authErrorResponse, getSession } from "@/lib/auth";
import { getBracketFormatOptionsForForms } from "@/lib/bracket-formats/settings-server";

/** Список форматов для форм создания/смены: только включённые, без техобслуживания. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const options = await getBracketFormatOptionsForForms();
    return NextResponse.json(
      { options },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
