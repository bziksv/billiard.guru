import type { GuideSection } from "@/lib/guide-content";

export const RULES_INDEX_INTRO_EN =
  "Pick a table type — the same categories clubs use on billiard.guru. Each section covers games and disciplines with a concise ruleset. For a tournament, always follow the official event regulations.";

export const BILLIARD_GENERAL_SECTIONS_EN: GuideSection[] = [
  {
    id: "handicap",
    title: "Handicap in tournaments",
    paragraphs: [
      "On billiard.guru, handicap is calculated from the rating difference in 0.5 steps by default: one full ball per frame, plus an extra ball in odd frames when the difference is not a whole number. The stronger player receives the minus.",
      "Organizers can disable half-step rounding — then only whole ratings count (e.g. 3 vs 1.5 → a 2-ball difference, not 2.5).",
      "Always check the tournament card for exact handicap rules before your match.",
    ],
  },
  {
    id: "etiquette",
    title: "Table etiquette",
    bullets: [
      "Do not distract your opponent while they aim or shoot.",
      "Agree on breaks and warm-up time before the frame starts.",
      "After the match — handshake and record the result with the referee or in the system.",
      "Disputes are resolved by the tournament referee or the senior staff on the floor.",
    ],
  },
  {
    id: "tournament-note",
    title: "Tournament regulations come first",
    paragraphs: [
      "This guide is an orientation for players and referees. Exact rules, penalties, and frame format always come from the specific tournament or federation regulations — they may differ from casual club play.",
    ],
  },
];
