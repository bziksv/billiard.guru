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
    updatedAt: "2026-08-21",
    sections: [
      {
        paragraphs: [
          "This document applies to https://billiard.guru/, https://billiard.guru/cabinet, and *.billiard.guru subdomains.",
          "ООО «ПРАЙМ» (the Operator) uses cookies as described in the full Russian Cookie policy at https://billiard.guru/legal/cookies. The Russian version is controlling.",
        ],
      },
      {
        title: "Summary",
        paragraphs: [
          "Cookies help the site work (session, preferences), improve the Service, and — where applicable — analytics and marketing. Blocking cookies may limit site features.",
          "You can refuse non-essential cookies in your browser settings; only essential cookies will then be used.",
          "Questions: info@billiard.guru.",
        ],
      },
    ],
  },
  "recommendation-technologies": {
    updatedAt: "2026-08-21",
    sections: [
      {
        paragraphs: [
          "This document applies to https://billiard.guru/, https://billiard.guru/cabinet, and *.billiard.guru subdomains.",
          "ООО «ПРАЙМ» uses recommendation technologies as described in the full Russian rules at https://billiard.guru/legal/recommendation-technologies. The Russian version is controlling.",
        ],
      },
      {
        title: "Summary",
        paragraphs: [
          "We may use actions on the Site, region/city, cookies, and technical data to recommend tournaments, clubs, Play a match listings, and related content, and to improve the Service.",
          "Questions: info@billiard.guru.",
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
