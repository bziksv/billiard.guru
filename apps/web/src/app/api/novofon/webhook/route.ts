import { NextRequest, NextResponse } from "next/server";
import {
  handleNovofonIncomingCallWebhook,
  parseNovofonWebhookParams,
  verifyNovofonWebhookRequest,
} from "@/lib/novofon-webhook";
import { logger } from "@/lib/logger";

async function readBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const bag: Record<string, string> = {};
    for (const [k, v] of params.entries()) bag[k] = v;
    return bag;
  }
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

async function handle(request: NextRequest) {
  const body = await readBody(request);
  const bag = parseNovofonWebhookParams(request.nextUrl.searchParams, body);

  const auth = verifyNovofonWebhookRequest({
    secretParam:
      request.nextUrl.searchParams.get("secret") ??
      (typeof body === "object" && body && "secret" in body
        ? String((body as Record<string, unknown>).secret)
        : null),
    clientIp: clientIp(request),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const result = await handleNovofonIncomingCallWebhook(bag);
  logger.info({ bag, result }, "Novofon webhook");

  /** Интерактивная обработка вызова (ИОВ): numa/numb в query */
  if (bag.numa && bag.numb) {
    return NextResponse.json({
      returned_code: result.ok ? "auth_ok" : "auth_miss",
    });
  }

  return NextResponse.json({ ok: result.ok });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
