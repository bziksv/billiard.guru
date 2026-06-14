import {
  getNovofonVerifyNumberE164Digits,
  getNovofonWebhookIps,
  getNovofonWebhookSecret,
} from "@/lib/novofon-config";
import { phonesMatchE164 } from "@/lib/phone-match";
import { confirmCallLoginChallenge } from "@/lib/login-challenge";
import { logger } from "@/lib/logger";

type ParamBag = Record<string, string | undefined>;

const CALLER_KEYS = [
  "contact_phone_number",
  "caller_number",
  "caller_id",
  "numa",
  "from",
  "phone",
  "contact",
] as const;

const CALLED_KEYS = [
  "virtual_phone_number",
  "called_number",
  "numb",
  "to",
  "destination",
] as const;

function flattenParams(input: unknown): ParamBag {
  if (!input || typeof input !== "object") return {};
  const bag: ParamBag = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      bag[key.toLowerCase()] = String(value);
    }
  }
  return bag;
}

export function parseNovofonWebhookParams(
  searchParams: URLSearchParams,
  body: unknown,
): ParamBag {
  const bag: ParamBag = {};
  for (const [key, value] of searchParams.entries()) {
    bag[key.toLowerCase()] = value;
  }

  if (body && typeof body === "object") {
    Object.assign(bag, flattenParams(body));
    const nested = (body as Record<string, unknown>).data;
    if (nested && typeof nested === "object") {
      Object.assign(bag, flattenParams(nested));
    }
  }

  return bag;
}

function pickPhone(bag: ParamBag, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = bag[key];
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function verifyNovofonWebhookRequest(options: {
  secretParam?: string | null;
  clientIp?: string | null;
}): { ok: true } | { ok: false; status: number; message: string } {
  const expectedSecret = getNovofonWebhookSecret();
  if (expectedSecret) {
    if (options.secretParam !== expectedSecret) {
      return { ok: false, status: 401, message: "Invalid webhook secret" };
    }
  }

  const ip = options.clientIp?.replace(/^::ffff:/, "") ?? "";
  if (ip && ip !== "127.0.0.1" && ip !== "::1") {
    const allowed = getNovofonWebhookIps();
    if (allowed.length > 0 && !allowed.includes(ip)) {
      logger.warn({ ip }, "Novofon webhook from unknown IP");
      if (process.env.NODE_ENV === "production" && expectedSecret) {
        return { ok: false, status: 403, message: "Forbidden IP" };
      }
    }
  }

  return { ok: true };
}

export async function handleNovofonIncomingCallWebhook(bag: ParamBag): Promise<{
  ok: boolean;
  message: string;
}> {
  const callerRaw = pickPhone(bag, CALLER_KEYS);
  const calledRaw = pickPhone(bag, CALLED_KEYS);
  const verifyDigits = getNovofonVerifyNumberE164Digits();

  if (!callerRaw) {
    return { ok: false, message: "No caller number in webhook" };
  }

  if (verifyDigits && calledRaw) {
    const calledDigits = calledRaw.replace(/\D/g, "");
    if (calledDigits && !phonesMatchE164(calledDigits, verifyDigits)) {
      return { ok: false, message: "Call to unexpected number" };
    }
  }

  const result = await confirmCallLoginChallenge(callerRaw);
  if (!result.ok) {
    logger.info({ callerRaw, reason: result.message }, "Novofon call auth not matched");
  }
  return result;
}
