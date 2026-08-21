import type { LegalDocSlug } from "@/lib/legal";
import type { LegalDocBody } from "@/lib/legal-bodies";

export const LEGAL_BODIES_EN: Record<LegalDocSlug, LegalDocBody> = {
  privacy: {
    updatedAt: "2026-08-21",
    sections: [
      {
        paragraphs: [
          "Operator: ООО «ПРАЙМ», INN 3665107119. Address: 394026, Voronezh, Moskovsky prospect, 19, office 19. E-mail: info@billiard.guru. Website: https://billiard.guru/.",
          "This Privacy and personal data processing policy (the Policy) describes how the Operator processes personal data of users of billiard.guru (the Service), including registration, tournaments, ratings, table bookings, Play a match listings, the Telegram bot, and related channels.",
          "The full Russian text of the Policy is the controlling version and is published at https://billiard.guru/legal/privacy.",
        ],
      },
      {
        title: "Purposes and data",
        paragraphs: [
          "We process data needed to operate the Service: name, phone, Telegram identity (when linked), city, profile photo, tournament and rating history, bookings, listings, cookies and technical logs.",
          "Purposes include account access, tournaments and brackets, ratings, bookings, notifications, security, analytics, and legal compliance.",
        ],
      },
      {
        title: "Rights and contact",
        paragraphs: [
          "You may request access, correction, restriction, or deletion as provided by Russian Federal Law No. 152-FZ, by writing to info@billiard.guru or by post to the address above.",
          "Consent may be withdrawn in the same way; withdrawal does not affect processing carried out before withdrawal where other legal grounds apply.",
        ],
      },
    ],
  },
  cookies: {
    updatedAt: "2026-06-08",
    sections: [
      {
        paragraphs: [
          "billiard.guru uses cookies and similar technologies for authentication, saving preferences, and collecting anonymized usage statistics.",
        ],
      },
      {
        title: "Cookies we use",
        paragraphs: [
          "Essential — session, language choice (NEXT_LOCALE), cookie consent.",
          "Analytics — page views to understand popular sections (no ad-network sharing through the Service).",
        ],
      },
      {
        title: "Managing cookies",
        paragraphs: [
          "You can delete or block cookies in your browser settings. Some features (sign-in, language memory) may stop working.",
          "On first visit we show a cookie notice; by continuing to use the site you agree to cookies for the purposes described here.",
        ],
      },
    ],
  },
  "recommendation-technologies": {
    updatedAt: "2026-06-08",
    sections: [
      {
        paragraphs: [
          "billiard.guru uses recommendation technologies — algorithms that suggest content based on your actions and region.",
        ],
      },
      {
        title: "What we recommend",
        paragraphs: [
          "Tournaments and clubs in your region — on the home page and in lists.",
          "Nearby events and Play a match listings based on selected city.",
          "Card order may consider start date, tournament status, and geographic proximity.",
        ],
      },
      {
        title: "How it works",
        paragraphs: [
          "Recommendations are not third-party advertising and are not based on paid placement.",
          "Change the region filter — recommendations will update.",
          "See the privacy policy for more on data use.",
        ],
      },
    ],
  },
  "personal-data-consent": {
    updatedAt: "2026-08-21",
    sections: [
      {
        paragraphs: [
          "This document applies to https://billiard.guru/, the account area https://billiard.guru/cabinet, and related *.billiard.guru subdomains.",
          "By giving this consent, I freely agree that ООО «ПРАЙМ» (INN 3665107119; the Operator) may process my personal data, including cookies, as described in the full Russian consent text at https://billiard.guru/legal/personal-data-consent and in the Privacy policy at https://billiard.guru/legal/privacy.",
        ],
      },
      {
        title: "Scope",
        paragraphs: [
          "Processing covers visitors, registered users, club representatives, partners, and persons contacting support — for operating the Service (registration, tournaments, ratings, bookings, Play a match, Telegram notifications), analytics, security, and legal compliance.",
        ],
      },
      {
        title: "Withdrawal",
        paragraphs: [
          "Consent may be withdrawn by signed notice to 394026, Voronezh, Moskovsky prospect, 19, office 19, or by qualified electronic signature to info@billiard.guru, as detailed in the Russian text.",
          "The Russian version is controlling.",
        ],
      },
    ],
  },
};
