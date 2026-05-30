import { NextRequest, NextResponse } from "next/server";
import { getLoginChallengeStatus } from "@/lib/login-challenge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const status = await getLoginChallengeStatus(token);
  if (!status) {
    return NextResponse.json({ error: "Запрос не найден" }, { status: 404 });
  }
  return NextResponse.json(status);
}
