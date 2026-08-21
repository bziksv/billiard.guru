import type { AppLocale } from "@/i18n/routing";
import type { LegalDocSlug } from "@/lib/legal";
import { LEGAL_BODIES_EN } from "@/lib/legal/en/bodies";
import { COOKIES_BODY_RU } from "@/lib/legal/ru/cookies";
import { PERSONAL_DATA_CONSENT_BODY_RU } from "@/lib/legal/ru/personal-data-consent";
import { PRIVACY_BODY_RU } from "@/lib/legal/ru/privacy";
import { RECOMMENDATION_TECHNOLOGIES_BODY_RU } from "@/lib/legal/ru/recommendation-technologies";

export type LegalDocTable = {
  headers: string[];
  rows: string[][];
};

export type LegalDocSection = {
  title?: string;
  paragraphs: string[];
  tables?: LegalDocTable[];
};

export type LegalDocBody = {
  sections: LegalDocSection[];
  updatedAt: string;
};

const LEGAL_BODIES_RU: Record<LegalDocSlug, LegalDocBody> = {
  privacy: PRIVACY_BODY_RU,
  cookies: COOKIES_BODY_RU,
  "recommendation-technologies": RECOMMENDATION_TECHNOLOGIES_BODY_RU,
  "personal-data-consent": PERSONAL_DATA_CONSENT_BODY_RU,
};

export function getLegalDocBody(slug: LegalDocSlug, locale: AppLocale): LegalDocBody {
  if (locale === "en") return LEGAL_BODIES_EN[slug];
  return LEGAL_BODIES_RU[slug];
}
