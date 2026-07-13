/** Публичные URL юридических документов (файлы зальёте в /public/legal/ или замените страницы). */
export const LEGAL_URLS = {
  privacy: "/legal/privacy",
  cookies: "/legal/cookies",
  recommendationTechnologies: "/legal/recommendation-technologies",
} as const;

export const COOKIE_CONSENT_STORAGE_KEY = "setka-cookie-consent";

export type LegalDocSlug = keyof typeof LEGAL_DOCS;

export const LEGAL_DOCS = {
  privacy: {
    title: "Политика об обработке и защите персональных данных пользователей",
    description: "",
    filePath: "/legal/privacy.odt",
  },
  cookies: {
    title: "Политика использования cookie-файлов",
    description: "",
    filePath: "/legal/cookies.odt",
  },
  "recommendation-technologies": {
    title: "Правила применения рекомендательных технологий",
    description: "",
    filePath: "/legal/recommendation-technologies.odt",
  },
} as const;
