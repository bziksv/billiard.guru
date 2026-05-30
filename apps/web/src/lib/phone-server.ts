import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function resolveCountryName(cityId: string): Promise<string | null> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { country: true },
  });
  return city?.country.nameRu ?? null;
}

export async function normalizePhoneForCity(
  phone: string,
  cityId: string,
): Promise<{ e164: string; error?: string }> {
  const countryName = (await resolveCountryName(cityId)) ?? "Россия";
  const result = normalizePhone(phone, countryName);
  if (!result.valid) {
    return { e164: "", error: result.error ?? "Некорректный телефон" };
  }
  return { e164: result.e164 };
}
