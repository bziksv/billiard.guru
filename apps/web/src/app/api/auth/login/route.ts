import { NextRequest, NextResponse } from "next/server";
import { resolveAuthByPhone } from "@/lib/auth-phone-flow";

/** @deprecated Prefer POST /api/auth/start — kept for compatibility. */
export async function POST(request: NextRequest) {
  try {
    const { phone, countryName } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const { error, result } = await resolveAuthByPhone(
      String(phone),
      countryName ? String(countryName) : undefined,
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Не удалось обработать запрос" }, { status: 500 });
    }

    if (result.mode === "login") {
      return NextResponse.json({
        challengeToken: result.challengeToken,
        expiresAt: result.expiresAt,
        message: result.message,
      });
    }

    if (result.mode === "confirm") {
      return NextResponse.json({
        mode: "confirm",
        confirmLink: result.confirmLink,
        message: result.message,
      });
    }

    return NextResponse.json({
      mode: "register",
      phone: result.phone,
      message: result.message,
    });
  } catch {
    return NextResponse.json({ error: "Не удалось начать вход" }, { status: 500 });
  }
}
