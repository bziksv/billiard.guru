import { NextRequest, NextResponse } from "next/server";
import { startCallAuthByPhone } from "@/lib/auth-call-flow";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const result = await startCallAuthByPhone(String(phone));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Не удалось начать вход звонком" }, { status: 500 });
  }
}
