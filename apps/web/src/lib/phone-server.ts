import { prisma } from "@/lib/prisma";
import { getPhoneRule, normalizePhoneAuto } from "@/lib/phone";
import {
  formatPhoneValidationError,
  type PhoneValidationErrorCode,
  type PhoneValidationErrorParams,
} from "@/lib/phone-validation-errors";

export async function resolveCountryName(cityId: string): Promise<string | null> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { country: true },
  });
  return city?.country.nameRu ?? null;
}

export type PhoneForCityResult = {
  e164: string;
  error?: string;
  errorCode?: PhoneValidationErrorCode;
  errorParams?: PhoneValidationErrorParams;
};

export async function normalizePhoneForCity(
  phone: string,
  cityId: string,
): Promise<PhoneForCityResult> {
  const cityCountry = (await resolveCountryName(cityId)) ?? "Россия";
  const result = normalizePhoneAuto(phone, cityCountry);
  if (!result.valid) {
    return {
      e164: "",
      error: result.error,
      errorCode: result.errorCode ?? "invalid",
      errorParams: result.errorParams,
    };
  }

  const phoneDial = getPhoneRule(result.countryName).dial;
  const cityDial = getPhoneRule(cityCountry).dial;
  if (phoneDial !== cityDial) {
    const params = { phoneDial, cityCountry, cityDial };
    return {
      e164: "",
      errorCode: "countryMismatch",
      errorParams: params,
      error: formatPhoneValidationError("countryMismatch", params, "ru"),
    };
  }

  return { e164: result.e164 };
}
