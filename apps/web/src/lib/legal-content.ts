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
    title: "Privacy policy",
    description: "How billiard.guru processes and protects users' personal data.",
    filePath: "/legal/privacy.pdf",
    keywords: ["privacy policy", "billiard guru privacy", "personal data"],
  },
  cookies: {
    title: "Cookie policy",
    description: "Which cookies are used on the site and how to manage them.",
    filePath: "/legal/cookies.pdf",
    keywords: ["cookie policy", "billiard guru cookies"],
  },
  "recommendation-technologies": {
    title: "Recommendation technologies",
    description:
      "How billiard.guru uses recommendation technologies and content personalization.",
    filePath: "/legal/recommendation-technologies.pdf",
    keywords: ["recommendation technologies", "personalization billiard guru"],
  },
  "personal-data-consent": {
    title: "Personal data processing consent",
    description: "Consent text for personal data processing when using the service.",
    filePath: "/legal/personal-data-consent.pdf",
    keywords: ["personal data consent", "data processing billiard guru"],
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
    "согласие персональные данные",
    "обработка данных billiard guru",
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
