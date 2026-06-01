import { NextRequest, NextResponse } from "next/server";
import { resolveAuthByPhone } from "@/lib/auth-phone-flow";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const { error, result } = await resolveAuthByPhone(String(phone));
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Не удалось обработать запрос" }, { status: 500 });
  }
}
