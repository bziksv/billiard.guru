import type { GuideSection } from "@/lib/guide-content";

export const BRACKET_GUIDE_SECTIONS_EN: Record<string, GuideSection> = {
  olympic: {
    id: "olympic",
    title: "Single elimination (fixed bracket)",
    format: "OLYMPIC",
    paragraphs: [
      "Classic knockout bracket: one loss and you are out; the winner advances to the next round. Every pairing is set right after the draw — the organizer clicks Generate bracket once.",
      "Players are sorted by rating and seeded (#1 is the strongest). The bracket is padded to the next power of two (8, 16, 32…); extra slots are byes.",
      "The doubles equivalent is PAIR_OLYMPIC — see the doubles elimination section.",
    ],
    bullets: [
      "Admin format label: Single elimination (one loss), shared 3rd places.",
      "Number of rounds = log₂(bracket size): 8 players → 3 rounds, 16 players → 4.",
      "Final winner takes 1st place; semifinal losers share 3rd and 4th.",
    ],
    examples: [
      {
        title: "Example: 8 players",
        description:
          "After rating-based seeding (1 = strongest). Round 1 matches:",
        table: {
          headers: ["Match", "Player 1", "Player 2", "Winner goes to"],
          rows: [
            ["#1", "Seed 1", "Seed 8", "semifinal #5"],
            ["#2", "Seed 4", "Seed 5", "semifinal #5"],
            ["#3", "Seed 3", "Seed 6", "semifinal #6"],
            ["#4", "Seed 2", "Seed 7", "semifinal #6"],
            ["#5", "—", "—", "final #7"],
            ["#6", "—", "—", "final #7"],
            ["#7", "—", "—", "1st place"],
          ],
        },
        diagram: `        #1 ──┐
               ├── #5 ──┐
        #2 ──┘          │
                        ├── #7  →  🏆
        #3 ──┐          │
               ├── #6 ──┘
        #4 ──┘`,
        steps: [
          "Round 1: four quarterfinals (#1–#4).",
          "Round 2: two semifinals (#5–#6) — winners of #1+#2 and #3+#4.",
          "Round 3: final (#7).",
        ],
      },
      {
        title: "Example: 6 players (8-slot bracket)",
        description:
          "Two slots stay empty — seeds 7 and 8 are not needed. Top seeds get byes:",
        steps: [
          "Seed 1 was drawn against seed 8 → seed 8 is missing → seed 1 advances without playing (bye).",
          "Seed 2 may also advance without a game if seed 7 is empty.",
          "Everyone else plays as in an 8-slot bracket — 5–7 matches total instead of 7 with a full field.",
        ],
      },
    ],
  },
  "olympic-bronze": {
    id: "olympic-bronze",
    title: "Single elimination with 3rd–4th place match",
    format: "OLYMPIC_1L_BRONZE",
    paragraphs: [
      "Same knockout scheme as single elimination, but semifinal losers do not get places automatically — they meet in an extra match for 3rd and 4th place.",
      "The final (last round, slot 1) decides 1st and 2nd. The 3rd–4th match (same round, slot 2) fills in after both semifinals finish.",
      "The doubles equivalent is PAIR_OLYMPIC_1L_BRONZE.",
    ],
    bullets: [
      "Admin format label: Single elimination (one loss) with separate 3rd–4th place match.",
      "Unlike OLYMPIC: there each semifinal branch gets a shared 3rd; here one playoff decides 3rd and 4th.",
      "Minimum 4 players so semifinals and a bronze match are possible.",
    ],
    examples: [
      {
        title: "Example: 8 players",
        description:
          "After semifinals, losers of #5 and #6 play for 3rd–4th; winners of #5 and #6 go to final #7.",
        steps: [
          "Rounds 1–2: same as a standard 8-player knockout bracket.",
          "Semifinals: winner to the final, loser to the 3rd–4th match.",
          "Final and 3rd–4th match can run in parallel once all four finalists are known.",
        ],
      },
    ],
  },
  "swiss-fixed": {
    id: "swiss-fixed",
    title: "16-player fixed bracket (up to 2 losses), QF start, shared 3rd",
    format: "FIXED_SWISS_16R4_2_3_mesta",
    paragraphs: [
      "Every match and every winner/loser path is predefined. Opening pairs follow seeding (like knockout). Layout: Start in the center, winner → right (1 →), loser → left (← 1).",
      "Match count depends on bracket size. For 16 players — the Setka reference bracket (16→8): 27 matches (#1–#27), 7 columns. For 32 players — 59 matches (#1–#59), 10 columns, lower rounds 1–4. For 64 — 119 matches, 11 columns. For 8 — 4 rounds × 4 = 16.",
      "The doubles equivalent is FIXED_PAIR_SWISS.",
    ],
    bullets: [
      "Admin format label: 16-player bracket (up to 2 losses), QF start, shared 3rd places.",
      "15 players → bracket sized for 16 (one bye in round 1).",
      "After a result, winner and loser move to the listed # slots immediately — no Next round button.",
    ],
    examples: [
      {
        title: "Example: 8 players, round 1 match #1",
        description: "Players A (seed 1) and B (seed 8) meet in round 1, slot 1:",
        steps: [
          "A wins → automatically to round 2, slot 1, top row (winners branch).",
          "B loses → to round 2, slot 5, top row (one-win branch / ← 1).",
          "Under the match you see loser to #… and winner to #… — numbers never change.",
        ],
        diagram: `        ← 1 (losers)    Start    1 → (winners)
                              A ─── B
                               ↓     ↓
                         ← 1         1 →
                       (slot 5)   (slot 1)
                         rnd 2      rnd 2`,
      },
      {
        title: "Example: where round 1 winners go",
        description: "All four round 1 matches in an 8-player bracket:",
        table: {
          headers: ["Round 1 slot", "Pair (seed)", "Winner →", "Loser →"],
          rows: [
            ["1", "1 vs 8", "round 2, slot 1", "round 2, slot 5"],
            ["2", "4 vs 5", "round 2, slot 1 (row 2)", "round 2, slot 5 (row 2)"],
            ["3", "3 vs 6", "round 2, slot 2", "round 2, slot 6"],
            ["4", "2 vs 7", "round 2, slot 2 (row 2)", "round 2, slot 6 (row 2)"],
          ],
        },
        steps: [
          "Winners of slots 1 and 2 meet in round 2, slot 1 — both with one win.",
          "Losers of slots 1 and 2 meet in round 2, slot 5 — both with zero wins.",
          "By the end of round 4 each player has played 4 matches; places follow win count.",
        ],
      },
      {
        title: "Example: 16 players (16→8)",
        description:
          "27 matches (#1–#27): first round in the center, lower left (#13–#16, #17–#20), upper (#9–#12), QF (#21–#24), semifinals and final.",
        diagram: `#1–#8  Round 1 (center)
#9–#12  Lower, round 1  ←  round 1 losers
#13–#16 Upper, round 1  →  round 1 winners
#17–#20 Cross (places 9–12)
#21–#24 Quarterfinals (places 5–8)
#25–#26 Semifinals
#27     Final`,
      },
    ],
    note: "Double elimination (like a 64-player bracket with a #129 lower bracket) is a separate sports regulation; the platform currently implements fixed Swiss with predefined winner/loser paths, not a full losers bracket.",
  },
  "swiss-fixed-bronze": {
    id: "swiss-fixed-bronze",
    title: "16-player bracket (up to 2 losses), QF start with 3rd–4th match",
    format: "FIXED_SWISS_16R4_1_3_mesto",
    paragraphs: [
      "Same reference 16→8 bracket (27 matches, 7 columns, QF) as the shared-3rd format, but 3rd and 4th place are decided by an extra match (#28) between semifinal losers (#25 and #26).",
      "Unlike the shared-3rd format: there semifinal losers get 3rd and 4th without playing each other; here — like OLYMPIC_1L_BRONZE — one bronze playoff.",
      "Also used for the 8-player variant (FIXED_SWISS_8R4_1_3_mesto, match #14).",
    ],
    bullets: [
      "Admin format label: 16-player bracket (up to 2 losses), QF start with 3rd–4th place match.",
      "After both semifinals, losers auto-fill #28; final #27 can run in parallel.",
      "Minimum 4 players (semifinals + 3rd–4th match).",
    ],
    examples: [
      {
        title: "Final column",
        diagram: `#25–#26  Semifinals → winners to #27
#27        Final (places 1–2)
#28        3rd–4th match (losers of #25 and #26)`,
      },
    ],
  },
  "swiss-fixed-32": {
    id: "swiss-fixed-32",
    title: "32-player bracket (up to 2 losses), QF start, shared 3rd",
    format: "FIXED_SWISS_32R4_2_3_mesta",
    paragraphs: [
      "Fixed Swiss bracket for 32 players. 59 matches, 10 columns: lower branch rounds 1–4 on the left, knockout from QF (#41–#44), quarterfinals from #53.",
      "Technical reference: docs/BRACKET_REFERENCE_32_16.md. After a template update in code — use Regenerate bracket in the tournament admin.",
    ],
    bullets: [
      "Admin format label: 32-player bracket (up to 2 losses), QF start, shared 3rd places.",
      "Lower: #17–#24 → cross #33–#40 → round 3 #48–#45 → round 4 #52–#49.",
      "Upper: #25–#32 → QF #41–#44 (paired) → quarterfinals #53–#56 (aligned with QF by Y).",
    ],
    examples: [
      {
        title: "Columns and match numbers (32→16)",
        diagram: `#1–#16   Round 1
#17–#24  Lower, round 1
#25–#32  Upper, round 1
#33–#40  Lower, round 2 (cross)
#41–#44  Quarterfinals
#48–#45  Lower, round 3
#52–#49  Lower, round 4
#53–#56  Quarterfinals
#57–#58  Semifinals
#59      Final`,
      },
    ],
  },
  "swiss-fixed-32-bronze": {
    id: "swiss-fixed-32-bronze",
    title: "32-player bracket (up to 2 losses), QF start with 3rd–4th match",
    format: "FIXED_SWISS_32R4_1_3_mesto",
    paragraphs: [
      "Same reference 32→16 bracket (59 matches) as the QF shared-3rd format, plus #60 — a match between semifinal losers (#57 and #58) for 3rd–4th place.",
      "Match #60 appears in the Final column below the final (#59), like #28 in the 16→8 bronze format.",
    ],
    bullets: [
      "Admin format label: 32-player bracket (up to 2 losses), QF start with 3rd–4th place match.",
      "After both semifinals, losers automatically fill #60.",
    ],
  },
  "swiss-fixed-32-r8": {
    id: "swiss-fixed-32-r8",
    title: "32-player bracket (up to 2 losses), R16 start, shared 3rd",
    format: "FIXED_SWISS_32R8_2_3_mesta",
    paragraphs: [
      "FIXED_SWISS_32R8_2_3_mesta — 55 matches, knockout from R16 (#41–#44): round-of-16 losers go straight to places 9–12, with no lower round 4 (#49–#52).",
      "Semifinal losers share 3rd place with no extra match.",
    ],
    bullets: [
      "Admin format label: 32-player bracket (up to 2 losses), R16 start, shared 3rd places.",
      "9 columns — shorter than the QF-start 32-player bracket (59 matches).",
      "Out in R16 (#41–#44) → places 9–12 immediately.",
    ],
    examples: [
      {
        title: "R16 elimination vs QF start",
        description:
          "Compared to the 59-match QF format, losers of #41–#44 do not continue in lower round 4 — they are placed 9th–12th right away.",
        steps: [
          "Rounds 1–3 and lower cross matches work like the full 32-player scheme.",
          "R16 (#41–#44): eight players; four losers exit to places 9–12.",
          "Winners continue to QF, semifinals, and final (#55–#59).",
        ],
      },
    ],
  },
  "swiss-fixed-32-r8-bronze": {
    id: "swiss-fixed-32-r8-bronze",
    title: "32-player bracket (up to 2 losses), R16 start with 3rd–4th match",
    format: "FIXED_SWISS_32R8_BRONZE",
    paragraphs: [
      "Same as FIXED_SWISS_32R8_BRONZE — 60 matches (#60 below the final), labeled knockout from R16.",
      "59 main matches plus #60 between semifinal losers for 3rd and 4th place.",
    ],
    bullets: [
      "Admin format label: 32-player bracket (up to 2 losses), R16 start with 3rd–4th place match.",
      "Match #60 sits in the Final column under #59.",
    ],
  },
  "swiss-fixed-32-r8-1-3": {
    id: "swiss-fixed-32-r8-1-3",
    title: "32-player bracket (up to 2 losses), R16 start with 3rd–4th match",
    format: "FIXED_SWISS_32R8_1_3_mesto",
    paragraphs: [
      "56 matches — copy of the R16 shared-3rd format (55) plus #60: bronze match between semifinal losers below the final.",
      "Knockout from R16 (#41–#44): round-of-16 losers go to places 9–12, no lower round 4.",
    ],
    bullets: [
      "Admin format label: 32-player bracket (up to 2 losses), R16 start with 3rd–4th place match.",
      "Same R16 elimination rules as FIXED_SWISS_32R8_2_3_mesta, with an added #60 playoff.",
      "After both semifinals, losers auto-fill #60.",
    ],
    examples: [
      {
        title: "Final column",
        diagram: `#57–#58  Semifinals → winners to #59
#59        Final (places 1–2)
#60        3rd–4th match (semifinal losers)`,
      },
    ],
  },
  "swiss-fixed-64-r8": {
    id: "swiss-fixed-64-r8",
    title: "64-player bracket (up to 2 losses), R16 start, shared 3rd",
    format: "FIXED_SWISS_64R8_2_3_mesta",
    paragraphs: [
      "Fixed Swiss bracket for 64 players. 111 matches, 11 columns: lower rounds 1–4, upper branch with R16 (#113–#116), semifinals and final #119.",
      "Knockout from R16 (#81–#88): losers go straight to places 17–24, with no lower round 4. Semifinal losers share 3rd place.",
      "Reference: docs/BRACKET_REFERENCE_64_32.md. After a template update — Regenerate bracket in admin.",
    ],
    bullets: [
      "Admin format label: 64-player bracket (up to 2 losses), R16 start, shared 3rd places.",
      "Lower: #33–#48 → cross #65–#80 → round 3 #96–#89 → round 4 #104–#97.",
      "Upper: #49–#64 → #81–#88 (R16) → #105–#112 → R16 pairs #113–#116 → #117 → #118 → #119.",
    ],
    examples: [
      {
        title: "Columns and match numbers (64→32)",
        diagram: `#1–#32   Round 1
#33–#48  Lower, round 1
#49–#64  Upper, round 1
#65–#80  Lower, round 2 (cross)
#81–#88  Upper, round 2 (R16)
#89–#96  Lower, round 3
#97–#104 Lower, round 4
#105–#112 Upper, round 3
#113–#116 Round of 16
#117–#118 Semifinals
#119     Final`,
      },
    ],
  },
  "swiss-fixed-64-r8-1-3": {
    id: "swiss-fixed-64-r8-1-3",
    title: "64-player bracket (up to 2 losses), R16 start with 3rd–4th match",
    format: "FIXED_SWISS_64R8_1_3_mesto",
    paragraphs: [
      "112 matches — copy of the 64-player R16 elim format (111) plus #120: bronze match between semifinal losers below the final.",
      "Out in R16 (#81–#88) means places 17–24 immediately, same as the shared-3rd variant.",
    ],
    bullets: [
      "Admin format label: 64-player bracket (up to 2 losses), R16 start with 3rd–4th place match.",
      "Match #120 appears in the Final column under #119.",
      "After both semifinals, losers automatically fill #120.",
    ],
    examples: [
      {
        title: "Final column",
        diagram: `#117–#118  Semifinals → winners to #119
#119         Final (places 1–2)
#120         3rd–4th match (semifinal losers)`,
      },
    ],
  },
  "swiss-fixed-128-r8": {
    id: "swiss-fixed-128-r8",
    title: "128-player bracket (up to 2 losses), R16 start, shared 3rd",
    format: "FIXED_SWISS_128R8_2_3_mesta",
    paragraphs: [
      "Fixed Swiss bracket for 128 players. 215 matches — knockout from R16: round-of-16 losers go straight to places 33–48, with no lower round 4.",
      "Semifinal losers share 3rd place with no extra match.",
    ],
    bullets: [
      "Admin format label: 128-player bracket (up to 2 losses), R16 start, shared 3rd places.",
      "Same R16 elimination logic as the 64-player format, scaled to 128.",
      "Out in R16 → places 33–48 immediately.",
    ],
    examples: [
      {
        title: "Scale vs 64-player bracket",
        description:
          "The layout mirrors the 64→32 reference: double the first-round field, same column structure, R16 elimination at the upper branch.",
        steps: [
          "Round 1: #1–#64 in the center column.",
          "Lower and upper branches through round 4, then R16 pairs.",
          "Four R16 losers take places 33–36, 37–40, 41–44, and 45–48.",
        ],
      },
    ],
  },
  "swiss-fixed-128-r8-1-3": {
    id: "swiss-fixed-128-r8-1-3",
    title: "128-player bracket (up to 2 losses), R16 start with 3rd–4th match",
    format: "FIXED_SWISS_128R8_1_3_mesto",
    paragraphs: [
      "216 matches — copy of the 128-player R16 elim format (215) plus #248: bronze match between semifinal losers below the final.",
      "Out in R16 means places 33–48, same as the shared-3rd variant.",
    ],
    bullets: [
      "Admin format label: 128-player bracket (up to 2 losses), R16 start with 3rd–4th place match.",
      "Match #248 appears in the Final column under the main final.",
      "After both semifinals, losers automatically fill #248.",
    ],
    examples: [
      {
        title: "Final column",
        diagram: `Semifinals → winners to final
Final        (places 1–2)
#248         3rd–4th match (semifinal losers)`,
      },
    ],
  },
  "swiss-fixed-256-r8-1-3": {
    id: "swiss-fixed-256-r8-1-3",
    title: "256-player bracket (up to 2 losses), R32 start with 3rd–4th match",
    format: "FIXED_SWISS_256R8_1_3_mesto",
    paragraphs: [
      "456 matches — knockout from R32, with #456 bronze below the final. Five lower rounds before the upper knockout phase.",
      "495 main matches plus #456 between semifinal losers for 3rd and 4th place.",
    ],
    bullets: [
      "Admin format label: 256-player bracket (up to 2 losses), R32 start with 3rd–4th place match.",
      "Largest fixed bracket on the platform — for major open events.",
      "Reference: docs/FIXED_SWISS_128R8_1_3_mesto.md (structure scales from 128).",
    ],
    examples: [
      {
        title: "Overview",
        description:
          "256 players, rating-based seeding, full predefined paths through five lower rounds and knockout from R32.",
        steps: [
          "Round 1: #1–#128 in the center — 128 opening matches.",
          "Lower rounds 1–5 on the left; upper branch converges to R32, then R16, QF, semifinals.",
          "Semifinal losers meet in #456; the final decides the champion.",
        ],
        diagram: `Lower rounds 1–5 (left)
        ↓
R32 knockout → R16 → QF → semifinals → final
                              ↓
                         #456 bronze`,
      },
    ],
  },
};
