import { formatPhoneDisplay } from "@/lib/phone";

/** E.164 цифры без «+», например 79952224714 */
export function getNovofonVerifyNumberE164Digits(): string | null {
  const raw = process.env.NOVOFON_VERIFY_NUMBER?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

export function isNovofonCallAuthConfigured(): boolean {
  return getNovofonVerifyNumberE164Digits() !== null;
}

/** Включено ли подтверждение звонком (номер активирован в Novofon). */
export function isNovofonCallAuthEnabled(): boolean {
  if (!isNovofonCallAuthConfigured()) return false;
  const flag = process.env.NOVOFON_CALL_AUTH_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return true;
}

export function getNovofonVerifyNumberDisplay(): string | null {
  const digits = getNovofonVerifyNumberE164Digits();
  if (!digits) return null;
  return formatPhoneDisplay(`+${digits}`, "Россия");
}

export function getNovofonApiKey(): string | null {
  return process.env.NOVOFON_API_KEY?.trim() || null;
}

export function getNovofonApiSecret(): string | null {
  return process.env.NOVOFON_API_SECRET?.trim() || null;
}

export function getNovofonWebhookSecret(): string | null {
  return process.env.NOVOFON_WEBHOOK_SECRET?.trim() || null;
}

/** IP Novofon для HTTP-уведомлений (можно дополнить через env). */
export function getNovofonWebhookIps(): string[] {
  const extra = process.env.NOVOFON_WEBHOOK_IPS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return ["37.139.38.215", ...extra];
}
