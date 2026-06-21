import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";
import type { BracketFormatSeoEntry } from "@/lib/bracket-formats/seo";

export const BRACKET_FORMAT_SEO_EN: Record<BracketFormatCode, BracketFormatSeoEntry> = {
  OLYMPIC: {
    code: "OLYMPIC",
    slug: "olimpiyskaya-sistema",
    pageTitle: "Single elimination tournament bracket",
    metaTitle: "Single elimination knockout bracket",
    metaDescription:
      "Classic single-elimination bracket: rating-based seeding, byes, and an interactive demo for 8–16 players. Create a tournament on billiard.guru.",
    lead: "Classic knockout bracket: one loss and you are out; every pairing is set right after the draw.",
    participantBadge: "2–64 players",
    keywords: [
      "single elimination bracket",
      "knockout tournament bracket",
      "elimination draw",
      "tournament seeding",
    ],
  },
  OLYMPIC_1L_BRONZE: {
    code: "OLYMPIC_1L_BRONZE",
    slug: "olimpiyskaya-s-bronzoy",
    pageTitle: "Single elimination bracket with 3rd–4th place match",
    metaTitle: "Single elimination + bronze match",
    metaDescription:
      "Single elimination with an extra match between semifinal losers for 3rd place. Demo bracket and tournament setup on billiard.guru.",
    lead: "Knockout bracket plus a separate match between semifinal losers to decide 3rd and 4th place.",
    participantBadge: "4–64 players",
    keywords: [
      "single elimination bronze match",
      "3rd place playoff",
      "knockout bracket with bronze",
    ],
  },
  FIXED_SWISS_32R4_2_3_mesta: {
    code: "FIXED_SWISS_32R4_2_3_mesta",
    slug: "setka-32-chelovek-1-4",
    pageTitle: "32-player tournament bracket — knockout from quarterfinals",
    metaTitle: "32-player bracket — up to 2 losses, QF start",
    metaDescription:
      "32-player fixed bracket: 59 matches, labeled knockout from quarterfinals. Interactive demo on billiard.guru.",
    lead: "Fixed 32-player bracket (59 matches), knockout from QF — semifinal losers share 3rd place.",
    participantBadge: "32 players",
    keywords: [
      "32 player tournament bracket quarterfinal",
      "32 player bracket QF",
      "59 matches 32 players",
    ],
  },
  FIXED_SWISS_32R4_1_3_mesto: {
    code: "FIXED_SWISS_32R4_1_3_mesto",
    slug: "setka-32-chelovek-1-4-s-bronzoy",
    pageTitle: "32-player bracket with QF start and 3rd–4th place match",
    metaTitle: "32-player bracket (QF) + 3rd–4th place match",
    metaDescription:
      "32-player bracket with knockout from QF and a bronze match (#60). 60-match demo on billiard.guru.",
    lead: "32→16 bracket (59+1 matches) with QF labeling plus match #60 for 3rd–4th between semifinal losers.",
    participantBadge: "32 players",
    keywords: [
      "32 player bracket bronze QF",
      "32 player tournament table quarterfinal",
      "match 60 billiards",
    ],
  },
  FIXED_SWISS_32R8_2_3_mesta: {
    code: "FIXED_SWISS_32R8_2_3_mesta",
    slug: "setka-32-chelovek-1-8",
    pageTitle: "32-player tournament bracket — knockout from round of 16",
    metaTitle: "32-player bracket — up to 2 losses, R16 start",
    metaDescription:
      "32-player fixed bracket: 55 matches, knockout from R16 — round-of-16 losers go straight to places 9–12.",
    lead: "Fixed 32-player bracket: 55 matches, 9 columns, knockout from R16 — out in R16 means places 9–12, no lower round 4.",
    participantBadge: "32 players",
    keywords: [
      "32 player tournament bracket round of 16",
      "32 player bracket R16",
      "55 matches 32 players",
    ],
  },
  FIXED_SWISS_32R8_1_3_mesto: {
    code: "FIXED_SWISS_32R8_1_3_mesto",
    slug: "setka-32-1-8-matc-za-3-4",
    pageTitle: "32-player bracket with R16 start and 3rd–4th place match",
    metaTitle: "32-player bracket (R16), 56 matches + bronze",
    metaDescription:
      "32-player bracket: knockout from R16 (56 matches) and a separate match #60 for 3rd–4th place. Demo on billiard.guru.",
    lead: "Knockout from R16 (55 main matches + match #60) — semifinal losers play for 3rd and 4th place.",
    participantBadge: "32 players",
    keywords: ["32 player bracket R16 bronze", "56 matches 32 players", "match 60 billiards"],
  },
  FIXED_SWISS_32R8_BRONZE: {
    code: "FIXED_SWISS_32R8_BRONZE",
    slug: "setka-32-chelovek-1-8-s-bronzoy",
    pageTitle: "32-player bracket with R16 start and 3rd–4th place match",
    metaTitle: "32-player bracket (R16) with bronze, 60 matches",
    metaDescription:
      "32-player bracket with knockout from R16 and a bronze match (#60). 60-match demo on billiard.guru.",
    lead: "Knockout from R16 (59 matches) plus match #60 between semifinal losers for 3rd and 4th place.",
    participantBadge: "32 players",
    keywords: [
      "32 player bracket bronze R16",
      "32 player tournament table",
      "3rd place match 32 players",
    ],
  },
  FIXED_SWISS_64R8_2_3_mesta: {
    code: "FIXED_SWISS_64R8_2_3_mesta",
    slug: "setka-64-chelovek-1-8",
    pageTitle: "64-player tournament bracket — knockout from round of 16",
    metaTitle: "64-player bracket — up to 2 losses, R16 start",
    metaDescription:
      "64-player fixed bracket: 111 matches, knockout from R16 — round-of-16 losers go straight to places 17–24.",
    lead: "Fixed 64-player bracket: 111 matches, 11 columns, knockout from R16 — out in R16 means places 17–24, no lower round 4; semifinalists share 3rd.",
    participantBadge: "64 players",
    keywords: [
      "64 player tournament bracket",
      "64 player bracket",
      "64 player tournament table",
    ],
  },
  FIXED_SWISS_64R8_1_3_mesto: {
    code: "FIXED_SWISS_64R8_1_3_mesto",
    slug: "setka-64-1-8-matc-za-3-4",
    pageTitle: "64-player bracket with R16 start and 3rd–4th place match",
    metaTitle: "64-player bracket (R16) + 3rd–4th place match",
    metaDescription:
      "64-player bracket: knockout from R16 (111 matches) and a separate match #120 for 3rd–4th place. Demo on billiard.guru.",
    lead: "Knockout from R16 for 64 players (111 main matches + match #120) — semifinal losers play for 3rd and 4th place.",
    participantBadge: "64 players",
    keywords: [
      "64 player bracket bronze",
      "64 player tournament table",
      "3rd place match R16",
    ],
  },
  FIXED_SWISS_128R8_2_3_mesta: {
    code: "FIXED_SWISS_128R8_2_3_mesta",
    slug: "setka-128-chelovek-1-8",
    pageTitle: "128-player tournament bracket — knockout from round of 16",
    metaTitle: "128-player bracket — up to 2 losses, R16 start",
    metaDescription:
      "128-player fixed bracket: 215 matches, knockout from R16 — round-of-16 losers go straight to places 33–48.",
    lead: "Fixed 128-player bracket: 215 matches, knockout from R16 — out in R16 means places 33–48, no lower round 4; semifinalists share 3rd.",
    participantBadge: "128 players",
    keywords: [
      "128 player tournament bracket",
      "128 player bracket",
      "128 player tournament table",
    ],
  },
  FIXED_SWISS_128R8_1_3_mesto: {
    code: "FIXED_SWISS_128R8_1_3_mesto",
    slug: "setka-128-1-8-matc-za-3-4",
    pageTitle: "128-player bracket with R16 start and 3rd–4th place match",
    metaTitle: "128-player bracket (R16) + 3rd–4th place match",
    metaDescription:
      "128-player bracket: knockout from R16 (215 matches) and a separate match #216 for 3rd–4th place. Demo on billiard.guru.",
    lead: "Knockout from R16 for 128 players (215 main matches + match #216) — semifinal losers play for 3rd and 4th place.",
    participantBadge: "128 players",
    keywords: [
      "128 player bracket bronze",
      "128 player tournament table",
      "3rd place match R16",
    ],
  },
  FIXED_SWISS_8R4_1_3_mesto: {
    code: "FIXED_SWISS_8R4_1_3_mesto",
    slug: "setka-8-chelovek-1-4-s-bronzoy",
    pageTitle: "8-player bracket with QF start and 3rd–4th place match",
    metaTitle: "8-player bracket (QF) + 3rd–4th place match",
    metaDescription:
      "8-player bracket with knockout from QF and a bronze match (#14). 14-match demo on billiard.guru.",
    lead: "8→4 bracket (13+1 matches) with QF labeling plus match #14 for 3rd–4th between semifinal losers.",
    participantBadge: "8 players",
    keywords: ["8 player bracket bronze", "8 player tournament table", "3rd place match"],
  },
  FIXED_SWISS_16R4_2_3_mesta: {
    code: "FIXED_SWISS_16R4_2_3_mesta",
    slug: "setka-16-chelovek-1-4",
    pageTitle: "16-player tournament bracket — knockout from quarterfinals",
    metaTitle: "16-player bracket — up to 2 losses, QF start",
    metaDescription:
      "16-player bracket with knockout from QF: 27 matches, semifinal losers share 3rd place. Demo on billiard.guru.",
    lead: "16→8 bracket (27 matches) with knockout from QF — semifinal losers get 3rd place with no extra match.",
    participantBadge: "16 players",
    keywords: ["16 player bracket", "16 player tournament table", "knockout QF"],
  },
  FIXED_SWISS_16R4_1_3_mesto: {
    code: "FIXED_SWISS_16R4_1_3_mesto",
    slug: "setka-16-chelovek-1-4-s-bronzoy",
    pageTitle: "16-player bracket with QF start and 3rd–4th place match",
    metaTitle: "16-player bracket (QF) + 3rd–4th place match",
    metaDescription:
      "16-player bracket with knockout from QF and a bronze match (#28). 28-match demo on billiard.guru.",
    lead: "16→8 bracket (27+1 matches) with knockout from QF plus match #28 for 3rd–4th between semifinal losers.",
    participantBadge: "16 players",
    keywords: [
      "16 player bracket bronze",
      "16 player tournament table",
      "3rd place match",
    ],
  },
  FIXED_SWISS_16R2_1_3_mesto: {
    code: "FIXED_SWISS_16R2_1_3_mesto",
    slug: "setka-16-chelovek-1-2-s-bronzoy",
    pageTitle: "16-player bracket with SF start and 3rd–4th place match",
    metaTitle: "16-player bracket (SF) + 3rd–4th place match",
    metaDescription:
      "16-player bracket: knockout from semifinals (24 matches); semifinal losers drop to #28 for 3rd–4th.",
    lead: "16→8 without QF — upper branch goes straight to semifinals; semifinal losers play match #28 below the final.",
    participantBadge: "16 players",
    keywords: [
      "16 player bracket semifinal",
      "16 player tournament table",
      "3rd place match",
    ],
  },
  FIXED_SWISS_256R8_1_3_mesto: {
    code: "FIXED_SWISS_256R8_1_3_mesto",
    slug: "setka-256-1-16-matc-za-3-4",
    pageTitle: "256-player bracket with R32 start and 3rd–4th place match",
    metaTitle: "256-player bracket (R32) + 3rd–4th place match",
    metaDescription:
      "256-player bracket: knockout from R32 (496 matches) and match #496 for 3rd–4th place. Demo on billiard.guru.",
    lead: "Knockout from R32 for 256 players (495 main matches + #496) — semifinal losers play for 3rd and 4th place.",
    participantBadge: "256 players",
    keywords: [
      "256 player bracket bronze",
      "256 player tournament table",
      "3rd place match R32",
    ],
  },
};
