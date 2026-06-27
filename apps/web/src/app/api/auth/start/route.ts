import { NextRequest, NextResponse } from "next/server";
import { resolveAuthByPhone } from "@/lib/auth-phone-flow";
import { parseApiLocale } from "@/lib/phone-api-error";

export async function POST(request: NextRequest) {
  try {
    const { phone, countryName, locale: localeRaw } = await request.json();
    const locale = parseApiLocale(localeRaw);
    if (!phone) {
      return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
    }

    const { error, errorCode, errorParams, result } = await resolveAuthByPhone(
      String(phone),
      countryName ? String(countryName) : undefined,
      locale,
    );
    if (error) {
      return NextResponse.json({ error, errorCode, errorParams }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Не удалось обработать запрос" }, { status: 500 });
  }
}
