import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_ALLOWED_PERIODS } from "@/lib/analytics/constants";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { getVisitorAnalyticsReport } from "@/lib/analytics/stats-server";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const raw = Number(request.nextUrl.searchParams.get("days") ?? "30");
    const periodDays = ANALYTICS_ALLOWED_PERIODS.has(raw) ? raw : 30;

    const report = await getVisitorAnalyticsReport(periodDays);
    return NextResponse.json(report);
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
