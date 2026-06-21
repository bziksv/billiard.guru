import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";

export const BRACKET_ADMIN_LABEL_EN: Record<BracketFormatCode, string> = {
  OLYMPIC: "Single elimination (one loss), shared 3rd places",
  OLYMPIC_1L_BRONZE: "Single elimination (one loss) with separate 3rd–4th place match",
  FIXED_SWISS_8R4_1_3_mesto:
    "8-player bracket (up to 2 losses), QF start with 3rd–4th place match",
  FIXED_SWISS_16R4_2_3_mesta:
    "16-player bracket (up to 2 losses), QF start, shared 3rd places",
  FIXED_SWISS_16R4_1_3_mesto:
    "16-player bracket (up to 2 losses), QF start with 3rd–4th place match",
  FIXED_SWISS_16R2_1_3_mesto:
    "16-player bracket (up to 2 losses), SF start with 3rd–4th place match",
  FIXED_SWISS_32R4_2_3_mesta:
    "32-player bracket (up to 2 losses), QF start, shared 3rd places",
  FIXED_SWISS_32R4_1_3_mesto:
    "32-player bracket (up to 2 losses), QF start with 3rd–4th place match",
  FIXED_SWISS_32R8_2_3_mesta:
    "32-player bracket (up to 2 losses), R16 start, shared 3rd places",
  FIXED_SWISS_32R8_1_3_mesto:
    "32-player bracket (up to 2 losses), R16 start with 3rd–4th place match",
  FIXED_SWISS_32R8_BRONZE:
    "32-player bracket (up to 2 losses), R16 start with 3rd–4th place match",
  FIXED_SWISS_64R8_2_3_mesta:
    "64-player bracket (up to 2 losses), R16 start, shared 3rd places",
  FIXED_SWISS_64R8_1_3_mesto:
    "64-player bracket (up to 2 losses), R16 start with 3rd–4th place match",
  FIXED_SWISS_128R8_2_3_mesta:
    "128-player bracket (up to 2 losses), R16 start, shared 3rd places",
  FIXED_SWISS_128R8_1_3_mesto:
    "128-player bracket (up to 2 losses), R16 start with 3rd–4th place match",
  FIXED_SWISS_256R8_1_3_mesto:
    "256-player bracket (up to 2 losses), R32 start with 3rd–4th place match",
};
