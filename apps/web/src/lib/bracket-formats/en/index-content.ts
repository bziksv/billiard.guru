import type { BracketsFormatGroup } from "@/lib/bracket-formats/index-content";

export const BRACKETS_INDEX_INTRO_EN =
  "Pick a format for your tournament — each page has an interactive demo and a Create tournament button. Draws, brackets, and results live on the platform, without Excel or manual tables.";

export const BRACKETS_FORMAT_GROUPS_EN: BracketsFormatGroup[] = [
  {
    id: "single-knockout",
    title: "Singles — elimination",
    lead: "Classic cup: losers are out, the full bracket is set right after the draw.",
    match: (f) =>
      f.definition.pairing === "single" && f.definition.layout === "olympic",
  },
  {
    id: "single-swiss",
    title: "Singles — Swiss",
    lead: "Everyone plays several rounds: next-round pairings follow the standings.",
    match: (f) =>
      f.definition.pairing === "single" && f.definition.layout === "swiss_dynamic",
  },
  {
    id: "single-fixed",
    title: "Singles — 16, 32, and 64 brackets",
    lead: "A ready-made scheme for a full field: every match and placement is predefined — handy for club events.",
    match: (f) =>
      f.definition.pairing === "single" && f.definition.layout === "swiss_fixed",
  },
  {
    id: "pair-knockout",
    title: "Doubles — elimination",
    lead: "Knockout for teams of two players.",
    match: (f) =>
      f.definition.pairing === "pair" && f.definition.layout === "olympic",
  },
  {
    id: "pair-swiss",
    title: "Doubles — Swiss",
    lead: "Swiss for pairs: teams meet round by round based on points and rating.",
    match: (f) =>
      f.definition.pairing === "pair" && f.definition.layout === "swiss_dynamic",
  },
  {
    id: "pair-fixed",
    title: "Doubles — 16, 32, and 64 team brackets",
    lead: "Fixed schemes for doubles events with a full roster.",
    match: (f) =>
      f.definition.pairing === "pair" && f.definition.layout === "swiss_fixed",
  },
];

export const BRACKET_INDEX_TEASER_EN: Record<string, string> = {
  OLYMPIC: "Classic knockout: lose once and you are out. Rating-based seeding.",
  OLYMPIC_1L_BRONZE: "Single elimination plus a separate match for 3rd–4th place.",
  SWISS: "Many games for everyone — round pairings follow the standings.",
  FIXED_SWISS: "Ready-made bracket for 16 players, up to two losses.",
  FIXED_SWISS_16_BRONZE: "16-player bracket with a proper 3rd/4th place resolution.",
  FIXED_SWISS_8R4_1_3_mesto:
    "8 players, quarterfinal start, and match #14 for bronze between semifinal losers.",
  FIXED_SWISS_16R4_2_3_mesta:
    "16 players, quarterfinal start — semifinal losers share 3rd without an extra match.",
  FIXED_SWISS_16R4_1_3_mesto:
    "16 players, quarterfinal start, and match #28 for bronze between semifinal losers.",
  FIXED_SWISS_16R2_1_3_mesto:
    "16 players, semifinal start (no QF), and match #28 below the final for 3rd–4th.",
  FIXED_SWISS_32: "32-player event — elimination from the quarterfinals.",
  FIXED_SWISS_32_BRONZE: "32 players, quarterfinal start, and a bronze match between semifinal losers.",
  FIXED_SWISS_32R8_2_3_mesta:
    "32 players, round of 16 — round-of-16 losers go straight to places 9–12.",
  FIXED_SWISS_32R8_1_3_mesto: "32 players, R8 elim plus a separate 3rd–4th place match (#60).",
  FIXED_SWISS_32R8_BRONZE: "32 players, round of 16, and a bronze match between semifinal losers.",
  FIXED_SWISS_64R8_2_3_mesta:
    "64 players, round of 16 — round-of-16 losers go straight to places 17–24.",
  FIXED_SWISS_64R8_1_3_mesto: "64 players, R8 elim plus a separate 3rd–4th place match (#120).",
  FIXED_SWISS_128R8_2_3_mesta:
    "128 players, round of 16 — round-of-16 losers go straight to places 33–48.",
  FIXED_SWISS_128R8_1_3_mesto: "128 players, R8 elim plus a separate 3rd–4th place match (#248).",
  FIXED_SWISS_256R8_1_3_mesto: "256 players, round of 32 start plus a 3rd–4th place match (#456).",
  FIXED_SWISS_64: "Large 64-player event — full scheme out of the box.",
  FIXED_SWISS_64_BRONZE: "64 players and a separate match for 3rd–4th place.",
  EXCEL_REF_64: "Proven 64-player scheme for large tournaments.",
  PAIR_OLYMPIC: "Doubles knockout: teams of two players.",
  PAIR_OLYMPIC_1L_BRONZE: "Doubles elimination with a bronze match.",
  PAIR_SWISS: "Doubles Swiss — teams play several rounds.",
  FIXED_PAIR_SWISS: "Doubles bracket for 16 teams.",
  FIXED_PAIR_SWISS_16_BRONZE: "16 pairs and a match for 3rd–4th place.",
  FIXED_PAIR_SWISS_32: "Doubles event for 32 teams.",
  FIXED_PAIR_SWISS_32_BRONZE: "32 teams with a bronze match.",
  FIXED_PAIR_SWISS_64: "Doubles scheme for 64 teams.",
  FIXED_PAIR_SWISS_64_BRONZE: "64 teams and a bronze match.",
};

export const BRACKET_FORMAT_CARD_TITLE_EN: Record<string, string> = {
  OLYMPIC: "Single elimination bracket",
  OLYMPIC_1L_BRONZE: "Single elimination + bronze match",
  SWISS: "Swiss system",
  FIXED_SWISS: "Fixed bracket — 16 players",
  FIXED_SWISS_16_BRONZE: "16-player bracket with bronze match",
  FIXED_SWISS_8R4_1_3_mesto: "8-player bracket (QF) + bronze",
  FIXED_SWISS_16R4_2_3_mesta: "16-player bracket (QF), shared 3rd",
  FIXED_SWISS_16R4_1_3_mesto: "16-player bracket (QF) + bronze",
  FIXED_SWISS_16R2_1_3_mesto: "16-player bracket (SF) + bronze",
  FIXED_SWISS_32: "32-player elimination (from QF)",
  FIXED_SWISS_32_BRONZE: "32-player bracket + bronze",
  FIXED_SWISS_32R8_2_3_mesta: "32-player bracket (R16 elim)",
  FIXED_SWISS_32R8_1_3_mesto: "32-player bracket (R16) + bronze",
  FIXED_SWISS_32R8_BRONZE: "32-player bracket (R16) + bronze",
  FIXED_SWISS_64R8_2_3_mesta: "64-player bracket (R16 elim)",
  FIXED_SWISS_64R8_1_3_mesto: "64-player bracket (R16) + bronze",
  FIXED_SWISS_128R8_2_3_mesta: "128-player bracket (R16 elim)",
  FIXED_SWISS_128R8_1_3_mesto: "128-player bracket (R16) + bronze",
  FIXED_SWISS_256R8_1_3_mesto: "256-player bracket (R32) + bronze",
  FIXED_SWISS_64: "64-player fixed bracket",
  FIXED_SWISS_64_BRONZE: "64-player bracket + bronze",
  EXCEL_REF_64: "64-player reference bracket",
  PAIR_OLYMPIC: "Doubles elimination",
  PAIR_OLYMPIC_1L_BRONZE: "Doubles elimination + bronze",
  PAIR_SWISS: "Doubles Swiss",
  FIXED_PAIR_SWISS: "Doubles bracket — 16 teams",
  FIXED_PAIR_SWISS_16_BRONZE: "16-team doubles + bronze",
  FIXED_PAIR_SWISS_32: "Doubles bracket — 32 teams",
  FIXED_PAIR_SWISS_32_BRONZE: "32-team doubles + bronze",
  FIXED_PAIR_SWISS_64: "Doubles bracket — 64 teams",
  FIXED_PAIR_SWISS_64_BRONZE: "64-team doubles + bronze",
};

export const BRACKETS_CHOOSE_ROWS_EN = [
  {
    format: "Single elimination",
    forWhom: "Cup events, fast knockout tournaments",
    size: "4 to 64 players",
  },
  {
    format: "Single elimination + bronze",
    forWhom: "Knockout with a separate match for 3rd place",
    size: "4 to 64 players",
  },
  {
    format: "Swiss",
    forWhom: "Many games per player, flexible field size",
    size: "Flexible roster",
  },
  {
    format: "16 / 32 / 64 bracket",
    forWhom: "Club events with a full roster",
    size: "Exactly 16, 32, or 64 players",
  },
] as const;

export const BRACKET_PLATFORM_FEATURES_EN = [
  {
    title: "Rating-based seeding",
    text: "Players are seeded automatically — top seeds avoid each other in the first round.",
  },
  {
    title: "Automatic advancement",
    text: "After a score is entered, winners and losers move to the next matches with no manual edits.",
  },
  {
    title: "Public bracket link",
    text: "Players and spectators see the live bracket on the tournament page — easy on mobile.",
  },
  {
    title: "Rating handicap",
    text: "Rating gaps show on the match card — players know the conditions before the game.",
  },
  {
    title: "Telegram alerts",
    text: "Match reminders and results in the billiard.guru bot after registration.",
  },
  {
    title: "Standings report",
    text: "Final placement table is generated when the event ends — ready for reporting.",
  },
] as const;
