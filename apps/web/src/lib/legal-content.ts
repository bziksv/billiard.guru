import type { AppLocale } from "@/i18n/routing";
import { LEGAL_DOCS, type LegalDocSlug } from "@/lib/legal";

export type LegalDocEntry = {
  title: string;
  description: string;
  filePath: string;
  keywords: string[];
};

const LEGAL_DOCS_EN: Record<LegalDocSlug, LegalDocEntry> = {
  privacy: {
    title: "Privacy and personal data processing policy",
    description:
      "Privacy policy of ООО «ПРАЙМ» for personal data on billiard.guru.",
    filePath: "/legal/privacy.odt",
    keywords: ["privacy policy", "billiard guru privacy", "personal data"],
  },
  cookies: {
    title: "Cookie policy",
    description: "",
    filePath: "/legal/cookies.odt",
    keywords: ["cookie policy", "billiard guru cookies"],
  },
  "recommendation-technologies": {
    title: "Recommendation technologies",
    description: "",
    filePath: "/legal/recommendation-technologies.odt",
    keywords: ["recommendation technologies", "personalization billiard guru"],
  },
  "personal-data-consent": {
    title: "Consent to personal data processing, including cookies",
    description:
      "User consent to personal data and cookie processing when using billiard.guru.",
    filePath: "",
    keywords: [
      "personal data consent",
      "billiard guru consent",
      "data processing consent",
    ],
  },
};

const LEGAL_KEYWORDS_RU: Record<LegalDocSlug, string[]> = {
  privacy: ["политика конфиденциальности", "персональные данные billiard guru"],
  cookies: ["cookie billiard guru", "политика cookie"],
  "recommendation-technologies": [
    "рекомендательные технологии",
    "персонализация billiard guru",
  ],
  "personal-data-consent": [
    "согласие на обработку персональных данных",
    "согласие billiard guru",
    "обработка ПДн согласие",
  ],
};

export function getLegalDoc(slug: LegalDocSlug, locale: AppLocale): LegalDocEntry {
  if (locale === "en") {
    return LEGAL_DOCS_EN[slug];
  }
  const entry = LEGAL_DOCS[slug];
  return {
    title: entry.title,
    description: entry.description,
    filePath: entry.filePath,
    keywords: LEGAL_KEYWORDS_RU[slug],
  };
}

export function getAllLegalDocSlugs(): LegalDocSlug[] {
  return Object.keys(LEGAL_DOCS) as LegalDocSlug[];
}
