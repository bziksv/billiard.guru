import type { BilliardHistory, BilliardTableType } from "@/lib/billiard-rules/content";
import { withBilliardHistory } from "@/lib/billiard-rules/history/attach-history";

const SNOOKER_TABLE_HISTORY_EN: BilliardHistory = {
  title: "History and geography of snooker",
  intro:
    "Snooker is a British game with 22 balls, narrow pockets, and point-based frames. Below — who invented it in India, how it reached England, became a televised sport, and took hold in China.",
  sections: [
    {
      id: "invention",
      title: "Who invented snooker and where",
      paragraphs: [
        "Snooker was invented in the late 19th century in India by British officers. Neville Chamberlain (not the prime minister) is most often credited — in 1875 in Jabalpur he proposed rules for a game with reds and colors based on pool and pyramid games.",
        "The name \"snooker\" comes from army slang for a raw recruit; officers used it for clumsy players. The game reached Great Britain in the 1880s and took root in officers' and billiard clubs.",
        "The 12 ft table matches English billiards; pockets are narrower than pool, but balls and scoring are unique: 15 reds worth 1 each, 6 colors with fixed values, frames, and \"snookers\".",
      ],
    },
    {
      id: "chronology",
      title: "Chronology",
      table: {
        headers: ["Year / period", "Event"],
        rows: [
          ["1875", "Presumed invention in Jabalpur, India"],
          ["1880s", "Game in clubs across Great Britain and Ireland"],
          ["1927", "First official World Championship (Joe Davis dominated until 1946)"],
          ["1969", "Televised \"Pot Black\" — snooker boom on BBC"],
          ["1977", "World Championship moves to Crucible Theatre, Sheffield — still there today"],
          ["1990s — present", "WPBSA, professional tour, China's rise from the 2000s"],
          ["2010s — present", "Ding Junhui and the Chinese school — millions of players in China"],
        ],
      },
    },
    {
      id: "wpbsa-standard",
      title: "WPBSA and the standard of play",
      paragraphs: [
        "The World Professional Billiards and Snooker Association (WPBSA) runs the professional tour and rules. 12 ft table, 22 balls (15 reds + 6 colors + cue ball), D-zone for break and ball-in-hand.",
        "Frame: while reds remain — alternate \"red + color\"; color returns to its spot. After all reds — colors in ascending order to black. Match — by frames won.",
        "Penalty points for a foul depend on the highest ball in play (4–7). Maximum 147 — all reds with black, then all colors.",
      ],
      table: {
        headers: ["Organization", "Role"],
        rows: [
          ["WPBSA", "Professional tour, rules, World Championship"],
          ["World Snooker Tour", "Commercial series, broadcasts"],
          ["National federations", "Amateur leagues, clubs"],
        ],
      },
    },
    {
      id: "geography",
      title: "Geography: where snooker is a culture",
      table: {
        headers: ["Region", "Level", "Comment"],
        rows: [
          ["United Kingdom, Ireland", "Very high", "Birthplace; Crucible, UK Championship, Masters"],
          ["China", "Very high", "Millions of players; academies from the 2000s; Ding Junhui and others"],
          ["Thailand, Hong Kong, Malaysia", "High", "Strong Asian schools, amateur leagues"],
          ["Europe (DE, PL…)", "Medium", "TV broadcasts, 12 ft club tables"],
          ["Russia", "Medium", "Moscow, St. Petersburg — dedicated tables; niche beside pyramid"],
          ["Australia, Canada", "Medium–high", "British heritage, amateur snooker"],
        ],
      },
    },
    {
      id: "culture-media",
      title: "Culture, Crucible, 147",
      paragraphs: [
        "The World Championship in Sheffield (Crucible Theatre since 1977) is an icon of British sport. UK Championship, Masters — the professional \"Triple Crown\". Ronnie O'Sullivan, Steve Davis, Stephen Hendry — names in world culture.",
        "Maximum 147 is a cultural phenomenon; prize money for a \"147\" at major events. Overhead TV cameras from the 1970s made snooker a spectator sport.",
        "In Russia snooker is a niche: 12 ft tables in larger halls, enthusiasts after pyramid. On billiard.guru it appears less often than pool and pyramid.",
      ],
      bullets: [
        "Break from the D-zone; cue ball must first contact a red.",
        "\"Snooker\" — when the cue ball cannot see the red/color with a straight shot; foul penalty for the opponent.",
        "Shortened formats (6 reds) — for TV and fast tournaments.",
      ],
    },
    {
      id: "trends",
      title: "What is changing now",
      bullets: [
        "China invests in academies — shift from British dominance in the top 16.",
        "6-red formats — Shoot Out, exhibition matches.",
        "Streams and YouTube — audience growth outside the UK.",
        "Women's snooker — separate tour and amateur leagues.",
        "In Russia — targeted growth of clubs with full-size snooker tables.",
      ],
    },
  ],
};

const SNOOKER_GAME_HISTORIES_EN: Record<string, BilliardHistory> = {
  klassicheskiy: {
    title: "Historical note: classic snooker",
    intro:
      "Classic snooker — 15 reds and 6 colors, point-based frames. The WPBSA professional tour standard and all World Championships.",
    sections: [
      {
        id: "origins",
        title: "How frame rules took shape",
        paragraphs: [
          "The classic frame formed by the early 20th century: while reds remain — pot a red, then any color (color returns to spot). When reds are gone — colors in order: yellow, green, brown, blue, pink, black.",
          "Match victory — by frames won (best of 9, 11, 17, 35 — per tournament). WPBSA rules stabilized in the second half of the 20th century.",
          "Minor updates: free ball after a foul, three miss rule, shot clock at select events.",
        ],
      },
      {
        id: "scoring",
        title: "Points and key concepts",
        table: {
          headers: ["Ball", "Points"],
          rows: [
            ["Red", "1"],
            ["Yellow", "2"],
            ["Green", "3"],
            ["Brown", "4"],
            ["Blue", "5"],
            ["Pink", "6"],
            ["Black", "7"],
          ],
        },
        note: "Foul — penalty points to opponent (minimum 4, up to 7 by highest ball in play).",
      },
      {
        id: "geography",
        title: "Where classic snooker is played",
        bullets: [
          "Professional tour — UK, China, international series.",
          "Amateurs — wherever there is a 12 ft table and snooker ball set.",
          "Russia — clubs in Moscow, St. Petersburg; occasional tournaments on billiard.guru.",
          "India — historical birthplace; now weaker than UK and China at pro level.",
        ],
      },
      {
        id: "legends",
        title: "Eras and stars",
        paragraphs: [
          "Joe Davis — first world champion (1927), dominance until 1946. Steve Davis and Stephen Hendry — 1980s–90s. Ronnie O'Sullivan — 147 and frame-speed records.",
          "Ding Junhui (China) — symbol of the Asian breakthrough from 2005. Several Chinese players regularly in the top 16 today.",
        ],
      },
      {
        id: "trends",
        title: "The present day",
        bullets: [
          "YouTube and messenger broadcasts — audience outside the UK.",
          "Amateur leagues in Russia — players coming from pyramid.",
          "6-red exhibitions — for new viewers.",
          "Crucible remains the symbol; rule format does not change radically.",
        ],
      },
    ],
  },
};

/** Snooker — extended content for /en/rules/snooker. Specs per WPBSA (World Professional Billiards and Snooker Association). */
const SNOOKER_TABLE_BASE: BilliardTableType = {
  id: "SNOOKER",
  slug: "snooker",
  title: "Snooker",
  lead: "21 balls, alternating reds and colors, and long frames — 12 ft table, pockets narrower than pool.",
  teaser: "Classic snooker: reds, colors, snookers, and matches to N frames.",
  pockets: true,
  pocketsLabel: "6 narrow pockets",
  seo: {
    title: "Snooker — rules, table specs and classic format",
    description:
      "Snooker reference guide: 15 reds, 6 colors, frames and matches. 12 ft table, narrow pockets, 52.5–53.5 mm balls. For players and referees.",
    keywords: [
      "snooker rules",
      "snooker billiards",
      "snooker frame",
      "reds and colors",
      "snooker snooker",
      "12 ft snooker table",
      "maximum 147",
      "classic snooker",
    ],
  },
  specs: [
    { label: "Pockets", value: "6 (narrow)" },
    { label: "Balls", value: "22 (15 reds + 6 colors + cue ball)" },
    { label: "Table size", value: "12 ft (≈ 3.6×1.8 m)" },
    { label: "Ball diameter", value: "52.5 / 53.5 mm" },
  ],
  overview: [
    "Snooker is a points game: while reds remain, players alternate red and any color; when reds are gone — colors in ascending value to black.",
    "The table is longer and narrower than pool, cloth is slower; pockets are tight — accuracy matters. Snookers and safety tactics decide the frame.",
  ],
  equipment: {
    title: "Table, ball, and pocket specs",
    intro:
      "Tournament standard — 12 ft per World Professional Billiards and Snooker Association (WPBSA) rules. Clubs often use 10 ft tables for training.",
    groups: [
      {
        title: "Playing surface and table",
        table: {
          headers: ["Parameter", "12 ft (tournament)", "10 ft (club)"],
          rows: [
            ["Playing surface", "3569 × 1778 mm", "≈ 2900 × 1450 mm"],
            ["Overall table size", "≈ 3840 × 2060 mm", "≈ 3200 × 1700 mm"],
            ["Height from floor", "≈ 850 mm", "≈ 850 mm"],
            ["Markings", "D-zone (baulk), color spots, baulk line", "Same elements"],
          ],
        },
      },
      {
        title: "Balls",
        table: {
          headers: ["Ball", "Qty", "Points / role"],
          rows: [
            ["Red", "15", "1 point"],
            ["Yellow", "1", "2 points"],
            ["Green", "1", "3 points"],
            ["Brown", "1", "4 points"],
            ["Blue", "1", "5 points"],
            ["Pink", "1", "6 points"],
            ["Black", "1", "7 points"],
            ["Cue ball", "1", "White, no point value"],
            ["Red diameter", "52.5 mm", "Colors and cue ball — 53.5 mm"],
          ],
        },
      },
      {
        title: "Pockets",
        table: {
          headers: ["Pocket type", "Feature"],
          rows: [
            ["Corner (4)", "Tight \"bags\" — precise potting"],
            ["Middle on long rail (2)", "As in pyramid — on the long side"],
            ["Difference from pool", "Narrower pockets; power play less common, position more important"],
            ["Ball return", "Balls not returned until end of frame"],
          ],
        },
      },
    ],
    note: "Colors return to spots after being potted; reds stay in the pocket. Before a match, check spot positions and cloth condition.",
  },
  checklist: {
    title: "Pre-game or pre-tournament checklist",
    intro: "Go through these at the table — fewer disputes about rules and equipment.",
    items: [
      {
        text: "Discipline confirmed",
        hint: "Classic snooker or shortened format (6 reds) — per tournament card.",
      },
      {
        text: "Match format",
        hint: "To N frames (e.g. best of 3, 5, or 9); shot time limit — per regulations.",
      },
      {
        text: "Color setup",
        hint: "Yellow, green, brown, blue, pink, black — on their spots; 15 reds — in a triangle.",
      },
      {
        text: "D-zone (baulk)",
        hint: "Break from the semicircle; after a foul — cue ball in D or penalty per regulations.",
      },
      {
        text: "Shot order",
        hint: "While reds remain: red → color → red. Then colors in ascending points.",
      },
      {
        text: "Ball on",
        hint: "Cue ball must first contact the required ball; otherwise foul and penalty points to opponent.",
      },
      {
        text: "Snooker",
        hint: "If a direct shot at ball on is impossible — miss or kick with declaration.",
      },
      {
        text: "Score and display",
        hint: "Points on the scoreboard; with a large lead the frame may be conceded early.",
      },
    ],
  },
  commonFouls: [
    "Did not first contact ball on.",
    "Ball did not reach a cushion and was not potted (no \"legal shot\").",
    "Potted wrong ball or wrong order (red/color).",
    "Cue ball in pocket or ball off table — penalty points to opponent.",
    "Shot not from D-zone when required (break, ball-in-hand after foul).",
    "Double hit, push shot, touching a ball by hand or foreign object.",
    "Jump shot — cue ball not touching cloth at moment of strike.",
    "Touching balls when returning a color to its spot.",
  ],
  games: [
    {
      slug: "klassicheskiy",
      title: "Classic snooker",
      subtitle: "Full format · 15 reds",
      badge: "Frames",
      tagline:
        "Match of frames: red + color while reds remain, then colors by value to black.",
      seo: {
        title: "Classic snooker — rules",
        description:
          "Classic snooker rules: red + color, colors phase, break from D-zone, snookers, penalty points and match to N frames.",
        keywords: [
          "classic snooker",
          "snooker rules",
          "snooker frame",
          "reds colors snooker",
          "snooker snooker",
          "snooker billiards",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Score more points than the opponent in a frame. Frame won when the score cannot be caught, or after the last ball (black) is potted.",
            "Match — to N frames (e.g. best of 3, 5, or 9) — per tournament regulations on billiard.guru.",
          ],
          bullets: [
            "Maximum points in one break with 15 reds — 147 (maximum break).",
            "Break — while you pot without a miss or foul.",
          ],
        },
        {
          id: "setup",
          title: "Setup",
          bullets: [
            "15 reds — tight triangle on the pink (or behind it); colors on spots: yellow at D line, green, brown, blue, pink, black.",
            "Cue ball — in the D-zone (semicircle at the baulk line).",
            "First break — by lot; break alternates by frame.",
          ],
        },
        {
          id: "scoring",
          title: "Points and balls",
          bullets: [
            "Red — 1, yellow — 2, green — 3, brown — 4, blue — 5, pink — 6, black — 7.",
            "While reds remain: pot red, then any color; color returns to spot, red stays in pocket.",
            "When reds are gone — colors strictly in ascending points to black.",
            "After the last red, usually blue, then pink, black — in order.",
          ],
        },
        {
          id: "break",
          title: "Break shot",
          paragraphs: [
            "First shot — from the D-zone. Cue ball must first contact a red; after the shot at least one ball — in a pocket or to a cushion.",
          ],
          bullets: [
            "Illegal break — 4-point penalty to opponent; opponent accepts or asks for re-break.",
            "Cue ball in pocket on break — 4 or 7 penalty (by highest ball in play) + opponent's turn.",
            "Power break less common than pool — leaving the cue ball for the break matters more.",
          ],
        },
        {
          id: "reds-phase",
          title: "\"Reds + color\" phase",
          bullets: [
            "After red — any color; if color not potted, it returns to spot.",
            "Potted red — must play a color; potted color — red again.",
            "Tactics: alternate \"easy\" colors (black, pink) with reds to build a break.",
            "If no direct shot at red — snooker or miss per rules.",
          ],
        },
        {
          id: "colors-phase",
          title: "\"Colors only\" phase",
          bullets: [
            "After last red — colors in order: yellow → green → brown → blue → pink → black.",
            "Each color potted once; not returned to spot.",
            "Black at the end — decisive; if tied before it, re-spot possible per regulations.",
            "Frame ends when black is potted or opponent concedes.",
          ],
        },
        {
          id: "snookers",
          title: "Snookers",
          paragraphs: [
            "Snooker — when a direct shot at ball on is impossible: cue ball blocked by other balls or angle does not work.",
          ],
          bullets: [
            "Player may ask referee to check snooker or play a kick with declaration.",
            "Miss on snooker — penalty points (minimum 4, or value of ball on).",
            "Free ball: after foul snooker, any ball may be nominated as red or ball on — per regulations.",
            "Tactics: leave opponent a difficult snooker — key to snooker defence.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls and penalties",
          bullets: [
            "Penalty — minimum 4 points, or value of ball on, or 7 — highest of them.",
            "Wrong ball first contact, wrong red/color order.",
            "Cue ball in pocket, ball off table — penalty + opponent's turn (often from D or \"ball in hand\" in D).",
            "Three consecutive misses on snooker — frame loss (tournament rule).",
            "Double hit, push shot, touching ball before stroke.",
          ],
        },
        {
          id: "match",
          title: "Match and frames",
          paragraphs: [
            "Match consists of frames; winner is whoever wins more frames (best of 3, 5, 9, etc.).",
          ],
          bullets: [
            "Break between frames; in long matches — interval.",
            "Conceding frame or match — per etiquette and regulations.",
            "On billiard.guru format and shot time limit — in tournament card.",
          ],
        },
      ],
    },
  ],
};

export const SNOOKER_TABLE_EN = withBilliardHistory(
  SNOOKER_TABLE_BASE,
  SNOOKER_TABLE_HISTORY_EN,
  SNOOKER_GAME_HISTORIES_EN,
);
