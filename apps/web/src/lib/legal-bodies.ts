import type { AppLocale } from "@/i18n/routing";
import type { LegalDocSlug } from "@/lib/legal";
import { LEGAL_BODIES_EN } from "@/lib/legal/en/bodies";
import { LEGAL_BODIES_RU_GENERATED } from "@/lib/legal/ru/bodies.generated";

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
  privacy: LEGAL_BODIES_RU_GENERATED.privacy!,
  cookies: LEGAL_BODIES_RU_GENERATED.cookies!,
  "recommendation-technologies": LEGAL_BODIES_RU_GENERATED["recommendation-technologies"]!,
};

export function getLegalDocBody(slug: LegalDocSlug, locale: AppLocale): LegalDocBody {
  if (locale === "en") return LEGAL_BODIES_EN[slug];
  return LEGAL_BODIES_RU[slug];
}
