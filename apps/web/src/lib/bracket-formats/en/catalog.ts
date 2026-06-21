import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";

export const BRACKET_SHORT_DESCRIPTION_EN: Record<BracketFormatCode, string> = {
  OLYMPIC:
    "Elimination after one loss; semifinal losers share 3rd place with no extra match.",
  OLYMPIC_1L_BRONZE:
    "Same single-elimination bracket as the shared-3rd variant, plus a match between semifinal losers for 3rd–4th place.",
  FIXED_SWISS_8R4_1_3_mesto:
    "8-player copy of the 16R4 bronze format — 14 matches (13 + #14 for 3rd–4th), knockout from QF.",
  FIXED_SWISS_16R4_2_3_mesta:
    "Same 16→8 reference bracket as FIXED_SWISS (27 matches) — knockout from QF, semifinal losers share 3rd with no extra match.",
  FIXED_SWISS_16R4_1_3_mesto:
    "Same 16→8 bronze bracket (28 matches) — knockout from QF plus match #28 for 3rd–4th.",
  FIXED_SWISS_16R2_1_3_mesto:
    "24 matches — no QF (#21–#24): upper R2 goes straight to semifinals; semifinal losers drop to #28 for 3rd–4th.",
  FIXED_SWISS_32R4_2_3_mesta:
    "Same 59-match bracket as FIXED_SWISS_32R8_2_3_mesta — labeled knockout from QF; semifinal losers share 3rd place.",
  FIXED_SWISS_32R4_1_3_mesto:
    "Same 60-match bracket as FIXED_SWISS_32R8_BRONZE — labeled QF + bronze match; #60 below the final.",
  FIXED_SWISS_32R8_2_3_mesta:
    "55 matches, 9 columns — knockout from R16 (#41–#44): losers go straight to places 9–12, no #49–#52; semifinalists share 3rd.",
  FIXED_SWISS_32R8_1_3_mesto:
    "56 matches — copy of R8_2_3_mesta (55) + #60: bronze match between semifinal losers below the final.",
  FIXED_SWISS_32R8_BRONZE:
    "60 matches — knockout from R16 (59) + #60, bronze match between semifinal losers below the final.",
  FIXED_SWISS_64R8_2_3_mesta:
    "111 matches, 11 columns — knockout from R16 (#81–#88): losers go straight to places 17–24, no lower round 4; semifinalists share 3rd.",
  FIXED_SWISS_64R8_1_3_mesto:
    "112 matches — copy of R8 elim (111) + #120: bronze match between semifinal losers below the final; out in R16 (#81–#88) means places 17–24.",
  FIXED_SWISS_128R8_2_3_mesta:
    "215 matches — knockout from R16: losers go straight to places 33–48, no lower round 4; semifinalists share 3rd.",
  FIXED_SWISS_128R8_1_3_mesto:
    "216 matches — copy of R8 elim (215) + #248: bronze match between semifinal losers below the final; out in R16 means places 33–48.",
  FIXED_SWISS_256R8_1_3_mesto:
    "456 matches — knockout from R32, #456 bronze below the final; five lower rounds.",
};
