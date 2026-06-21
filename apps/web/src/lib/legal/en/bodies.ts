import type { LegalDocSlug } from "@/lib/legal";
import type { LegalDocBody } from "@/lib/legal-bodies";

export const LEGAL_BODIES_EN: Record<LegalDocSlug, LegalDocBody> = {
  privacy: {
    updatedAt: "2026-06-08",
    sections: [
      {
        paragraphs: [
          "This policy describes how billiard.guru (the Service) processes personal data of users: players, tournament organizers, club representatives, and site visitors.",
          "We process data to enable registration, run tournaments, display ratings, send notifications, and improve the platform.",
        ],
      },
      {
        title: "Data we collect",
        paragraphs: [
          "Name, city, Telegram contact, profile photo (if uploaded), rating, and tournament history.",
          "Club data: name, address, schedule, photos, contacts.",
          "Technical data: cookies, IP address, browser and device information, page views (analytics).",
        ],
      },
      {
        title: "Purposes of processing",
        paragraphs: [
          "Registration and sign-in via Telegram.",
          "Publishing tournaments, brackets, results, and ratings.",
          "Sending match and event notifications (with user consent).",
          "Security and service improvement.",
        ],
      },
      {
        title: "Sharing with third parties",
        paragraphs: [
          "Profile data (name, city, rating) may be visible to other users on public tournament and rating pages.",
          "Technical providers (hosting, analytics, Telegram Bot API) receive only the minimum data needed to operate the Service.",
          "We do not sell personal data.",
        ],
      },
      {
        title: "Retention and your rights",
        paragraphs: [
          "Data is kept while your account is active, or longer when required for tournament history and ratings.",
          "You may request access, correction, or deletion via the contact listed on the site.",
          "By using the Service you confirm that you have read this policy.",
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
    updatedAt: "2026-06-08",
    sections: [
      {
        paragraphs: [
          "By registering on billiard.guru and using the Service, you consent to personal data processing as described in the privacy policy.",
        ],
      },
      {
        title: "Scope of consent",
        paragraphs: [
          "Processing of name, contacts, city, photo, tournament participation, and reviews.",
          "Publishing your profile and results in public sections of the site.",
          "Sending notifications via the Telegram bot (when enabled in settings).",
        ],
      },
      {
        title: "Withdrawal",
        paragraphs: [
          "Consent may be withdrawn by contacting the Service operator. Withdrawal does not affect the lawfulness of processing before withdrawal.",
          "Account deletion and limiting data publication is available on request.",
        ],
      },
    ],
  },
};
