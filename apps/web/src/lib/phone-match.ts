/** Сравнение номеров: E.164, 8XXXXXXXXXX, 7XXXXXXXXXX. */
export function normalizePhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }
  return digits;
}

export function phonesMatchE164(a: string, b: string): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.endsWith(db) || db.endsWith(da)) {
    const longer = da.length >= db.length ? da : db;
    const shorter = da.length >= db.length ? db : da;
    return longer.endsWith(shorter) && shorter.length >= 10;
  }
  return false;
}
