/** Публичные URL юридических документов (файлы зальёте в /public/legal/ или замените страницы). */
export const LEGAL_URLS = {
  privacy: "/legal/privacy",
  cookies: "/legal/cookies",
  personalDataConsent: "/legal/personal-data-consent",
  recommendationTechnologies: "/legal/recommendation-technologies",
} as const;

export const COOKIE_CONSENT_STORAGE_KEY = "setka-cookie-consent";

export type LegalDocSlug = keyof typeof LEGAL_DOCS;

export const LEGAL_DOCS = {
  privacy: {
    title: "Политика конфиденциальности",
    description: "Как billiard.guru обрабатывает и защищает персональные данные пользователей.",
    filePath: "/legal/privacy.pdf",
  },
  cookies: {
    title: "Политика использования cookie-файлов",
    description: "Какие cookie используются на сайте и как ими управлять.",
    filePath: "/legal/cookies.pdf",
  },
  "recommendation-technologies": {
    title: "Рекомендательные технологии",
    description:
      "Как на billiard.guru используются рекомендательные технологии и персонализация контента.",
    filePath: "/legal/recommendation-technologies.pdf",
  },
  "personal-data-consent": {
    title: "Согласие на обработку персональных данных",
    description: "Текст согласия на обработку персональных данных при использовании сервиса.",
    filePath: "/legal/personal-data-consent.pdf",
  },
} as const;
