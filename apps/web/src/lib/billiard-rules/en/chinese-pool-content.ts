import type { BilliardHistory, BilliardTableType } from "@/lib/billiard-rules/content";
import { withBilliardHistory } from "@/lib/billiard-rules/history/attach-history";

const CHINESE_POOL_TABLE_HISTORY_EN: BilliardHistory = {
  title: "History and geography of Chinese pool",
  intro:
    "Chinese pool uses the same 9 ft table and 57 mm balls as classic pool, but tournament rules are stricter: break, call pocket, \"three fouls — loss of frame\". Below — how the format grew from Asian leagues in the 1990s–2000s and how it differs from bar eight-ball.",
  sections: [
    {
      id: "origins",
      title: "Who created Chinese pool and why",
      paragraphs: [
        "There is no single inventor: Chinese eight-ball took shape in China in the 1990s–2000s, when clubs with American tables spread and a tournament format stricter than US bar eight-ball was needed.",
        "National leagues and associations (billiards in China accelerated with mass-sport policy and television) added: mandatory call pocket on final balls and often on every shot, strict break requirements, and the penalty \"three consecutive fouls without hitting your own ball — loss of frame\".",
        "The table is the same — 9 ft, six pockets, 57 mm balls. The difference is in the rules, not the equipment. On billiard.guru \"Chinese pool\" is listed separately from classic pool.",
      ],
    },
    {
      id: "chronology",
      title: "Chronology",
      table: {
        headers: ["Period", "Event"],
        rows: [
          ["1980s–1990s", "First mass pool clubs in China; import of tables and balls"],
          ["1990s–2000s", "Formation of \"Chinese eight-ball\" with strict break and call pocket"],
          ["2000s", "Professional leagues, televised tournaments in China"],
          ["2010s — present", "Format export: clubs in Russia, Southeast Asia with \"Chinese regulations\" label"],
          ["Present", "Parallel development with nine-ball and ten-ball in Asian academies"],
        ],
      },
    },
    {
      id: "vs-american-8",
      title: "Chinese vs American pool",
      table: {
        headers: ["", "Bar / WPA eight-ball", "Chinese eight-ball"],
        rows: [
          ["Table", "7–9 ft, 57 mm", "Same 9 ft standard"],
          ["Break", "4 balls to cushion (WPA)", "Stricter: often 4+ to cushion + full cue ball exit"],
          ["Call pocket", "Only on the 8 (WPA)", "Often on every shot or from the 8 ball"],
          ["3 fouls in a row", "Rare in bars", "Loss of frame (China leagues)"],
          ["Ball in hand", "Behind head string (WPA)", "Per league regulations — sometimes head string only"],
        ],
      },
      note: "Confirm regulations at your club — Chinese rules have regional variants.",
    },
    {
      id: "geography",
      title: "Geography",
      table: {
        headers: ["Region", "Level", "Comment"],
        rows: [
          ["China", "Very high", "Millions of players, pro leagues, TV"],
          ["Hong Kong, Taiwan", "High", "Clubs and national series"],
          ["Southeast Asia", "Medium–high", "Growth alongside nine-ball and ten-ball"],
          ["Russia", "Growing", "Chain clubs with \"Chinese pool\" in Moscow and regions"],
          ["Europe, USA", "Niche", "Diaspora, separate leagues"],
        ],
      },
    },
    {
      id: "culture",
      title: "Culture and media",
      paragraphs: [
        "Chinese pool is part of China's huge billiards industry: clubs as social hubs, TV tournaments, sponsors, streams with strict refereeing.",
        "Spectators like predictability: fewer \"lucky\" wins, more responsibility for break and call. Players from Russia who know WPA eight-ball often adapt to Chinese regulations before Asian network tournaments.",
        "On billiard.guru tournaments labeled \"Chinese pool\" are a separate table type in the club catalog.",
      ],
      bullets: [
        "Do not confuse with \"Chinese nine-ball\" or \"Chinese ten-ball\" — different disciplines on the same table.",
        "Three consecutive fouls — a signature penalty in Chinese leagues.",
        "8 ball in pocket with cue ball on a foul — often instant loss.",
      ],
    },
    {
      id: "trends",
      title: "What is gaining momentum",
      bullets: [
        "Tables with Chinese regulations in Russian club chains.",
        "Streams of Asian matches — popularizing strict breaks.",
        "Pool players wanting \"tournament discipline\" switch from bar eight-ball.",
        "Parallel with WPA ten-ball: both trends — less luck, more call pocket.",
      ],
    },
  ],
};

const CHINESE_POOL_GAME_HISTORIES_EN: Record<string, BilliardHistory> = {
  "kitayskaya-vosmerka": {
    title: "Historical note: Chinese eight-ball",
    intro:
      "The main Chinese pool discipline — solids, stripes, black 8, and strict tournament regulations of China leagues.",
    sections: [
      {
        id: "origins",
        title: "How Chinese eight-ball took hold",
        paragraphs: [
          "Chinese eight-ball was an answer to the \"luck\" of US bar eight-ball: mandatory call (on the final stage or every shot — per league), strict break, consecutive fouls as loss of frame.",
          "Rules were developed by CBSA (Chinese Billiards & Snooker Association) and commercial leagues; televised tournaments needed clear penalties for viewers.",
          "Group mechanics (solids/stripes) match classic eight-ball, but penalties and break are stricter. Variants between provinces and club chains are possible.",
        ],
      },
      {
        id: "rules-key",
        title: "Key differences from WPA",
        bullets: [
          "Break: cue ball in pocket — foul; opponent spots per regulations.",
          "Call pocket before the shot (mandatory on the 8; in some leagues — always).",
          "Three consecutive fouls without hitting your own ball — loss of frame.",
          "8 in wrong pocket or with a foul — loss.",
          "Ball in hand after foul — where you may place it is set by the league.",
        ],
      },
      {
        id: "geography",
        title: "Geography",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["China", "Professional circuit, millions of amateurs"],
            ["Russia", "Clubs in Moscow, regions; \"Chinese pool\" tournaments"],
            ["CIS", "Selectively via chain hall brands"],
            ["Southeast Asia", "Growth alongside Asian pool"],
          ],
        },
      },
      {
        id: "vs-pool",
        title: "Alongside classic pool",
        paragraphs: [
          "One hall may have \"American\" and \"Chinese\" eight-ball tables — the difference is regulations, not size. A player used to bar rules in Russia often loses at Chinese tournaments because of three-foul rules and call pocket.",
          "On billiard.guru check the tournament card for table type and description — \"Chinese pool\" or classic \"pool\".",
        ],
      },
      {
        id: "trends",
        title: "Trends",
        bullets: [
          "Growing interest from WPA players wanting Asian series.",
          "Streams of Chinese finals with English commentary.",
          "Clubs in Russia adopt \"as in China\" regulations to stand out from neighboring halls.",
        ],
      },
    ],
  },
};

/** Chinese pool — extended content for /en/rules/chinese-pool. Specs per Chinese leagues and clubs. */
const CHINESE_POOL_TABLE_BASE: BilliardTableType = {
  id: "CHINESE_POOL",
  slug: "chinese-pool",
  title: "Chinese pool",
  lead: "9 ft pool table with a strict break and its own rules: solids and stripes, win by legally potting the 8.",
  teaser: "Chinese eight-ball — the main format in Asian and club leagues.",
  pockets: true,
  pocketsLabel: "6 pockets",
  seo: {
    title: "Chinese pool — rules, table specs and Chinese eight-ball",
    description:
      "Chinese pool reference guide: Chinese eight-ball, strict break, call pocket, ball in hand. 9 ft table, 57 mm balls. For players and referees.",
    keywords: [
      "chinese pool",
      "chinese eight ball",
      "chinese 8 ball rules",
      "chinese pool rules",
      "chinese pool break",
      "call pocket",
      "9 ft table",
      "pool balls 57 mm",
    ],
  },
  specs: [
    { label: "Pockets", value: "6 (wide)" },
    { label: "Balls", value: "15 + cue ball" },
    { label: "Table size", value: "9 ft (tournament)" },
    { label: "Ball diameter", value: "57.15 mm (2¼″)" },
  ],
  overview: [
    "Chinese pool is played on a standard pool table with rules close to eight-ball, but with a stricter break, harsh penalties, and frequent call pocket.",
    "On billiard.guru clubs mark such tables separately from classic pool. Tournaments follow league regulations — check details in the event card.",
  ],
  equipment: {
    title: "Table, ball, and pocket specs",
    intro:
      "Tournament standard for Chinese eight-ball — 9 ft table. Balls and pockets as in classic pool; the difference is break regulations and foul penalties.",
    groups: [
      {
        title: "Playing surface and table",
        table: {
          headers: ["Parameter", "9 ft (tournament)", "8 ft (club)"],
          rows: [
            ["Playing surface", "2540 × 1270 mm", "2240 × 1120 mm"],
            ["Table dimensions", "≈ 2900 × 1630 mm", "≈ 2600 × 1450 mm"],
            ["Markings", "Kitchen, head string, foot spot", "Same elements"],
            ["Cloth", "Pool cloth, moderate speed", "In leagues — unified hall standard"],
          ],
        },
      },
      {
        title: "Balls",
        table: {
          headers: ["Parameter", "Standard", "Note"],
          rows: [
            ["Set", "16 balls", "15 object balls + 1 cue ball"],
            ["Groups", "1–7 solids, 9–15 stripes", "8 — black, neutral"],
            ["Cue ball", "White", "Break strictly from head string"],
            ["Diameter", "57.15 mm", "Same as classic pool"],
          ],
        },
      },
      {
        title: "Pockets",
        table: {
          headers: ["Pocket type", "Feature"],
          rows: [
            ["Corner and side", "6 pockets, as in pool", "Side pockets — on short rail"],
            ["Call pocket", "Often mandatory", "Especially for the 8 and decisive balls"],
            ["Ball in hand", "After foul — per league regulations", "Sometimes head string only"],
          ],
        },
      },
    ],
    note: "International leagues inspect table and balls before a match. In club play deviations are allowed — agree before the frame.",
  },
  checklist: {
    title: "Pre-game or pre-tournament checklist",
    intro: "Go through these points at the table — fewer disputes about regulations and equipment.",
    items: [
      {
        text: "Discipline confirmed",
        hint: "Chinese eight-ball is the main format; other variants are rare — check with the organizer.",
      },
      {
        text: "Match format",
        hint: "To N wins, to 7/9 frames or time limit — in the tournament card on billiard.guru.",
      },
      {
        text: "Break rules",
        hint: "Usually: minimum 4 balls to cushion or a legal pot; otherwise penalty and opponent's turn.",
      },
      {
        text: "Call pocket",
        hint: "In leagues often mandatory on every legal shot, including the 8.",
      },
      {
        text: "Ball in hand after foul",
        hint: "Where you may place the cue ball — behind head string or anywhere on table; fix before the frame.",
      },
      {
        text: "Three consecutive fouls",
        hint: "In professional leagues — loss of frame; in clubs may not apply.",
      },
      {
        text: "Ball group",
        hint: "Solids (1–7) or stripes (9–15) — by first legal pot or choice.",
      },
      {
        text: "Black 8",
        hint: "Only after all your balls are cleared; call pocket before the shot.",
      },
    ],
  },
  commonFouls: [
    "Illegal break — not enough balls to cushion or no legal pot.",
    "Cue ball did not first contact your ball or went in a pocket.",
    "Object ball did not reach cushion and was not potted (no \"legal shot\").",
    "Hit opponent's ball or the 8 before clearing your group.",
    "Wrong ball or wrong pocket — when call pocket is mandatory.",
    "Double hit, push shot, touching a ball by hand.",
    "Ball off table — penalty and opponent's turn.",
    "Three consecutive fouls without hitting your own — loss of frame (per league regulations).",
  ],
  games: [
    {
      slug: "kitayskaya-vosmerka",
      title: "Chinese eight-ball",
      subtitle: "Chinese pool · solids and stripes",
      badge: "League",
      tagline:
        "Your balls by number, strict break and call pocket. Win by legally potting the 8 after clearing your group.",
      seo: {
        title: "Chinese eight-ball — rules",
        description:
          "Chinese eight-ball rules: solids and stripes, strict break, call pocket, three consecutive fouls and play on the black. Asian league format.",
        keywords: [
          "chinese eight ball",
          "chinese 8 ball",
          "chinese pool rules",
          "chinese pool",
          "solids stripes",
          "eight ball break",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Clear all your balls (solids 1–7 or stripes 9–15), then legally pot the black 8 in the called pocket.",
            "Loss — if the 8 goes early, with a foul, in the wrong pocket, or on three consecutive fouls without hitting your own (per league regulations).",
          ],
          bullets: [
            "Match — to N wins; format set by organizer on billiard.guru.",
            "Table is \"open\" until a group is determined.",
          ],
        },
        {
          id: "setup",
          title: "Setup",
          bullets: [
            "15 balls — triangle on foot spot; cue ball — in kitchen behind head string.",
            "Black 8 stays on table until the final stage.",
            "First break — by lot; in following frames — alternation.",
          ],
        },
        {
          id: "break",
          title: "Break",
          paragraphs: [
            "Break only from head string — cue ball fully behind the line. Hard hit on the rack; requirements stricter than classic eight-ball.",
          ],
          bullets: [
            "Typical: minimum 4 balls must touch cushion or at least one ball — in a pocket.",
            "Illegal break — penalty: opponent plays ball in hand or asks for re-break.",
            "Cue ball in pocket on break — foul; opponent spots cue ball per regulations.",
            "8 potted on break — spot on foot spot or re-break.",
          ],
        },
        {
          id: "groups",
          title: "Choosing a group",
          bullets: [
            "Group determined by first legally potted ball (except the 8).",
            "If both types count — player chooses solids or stripes.",
            "Table stays open until a legal pot.",
            "Accidental opponent ball in pocket — per regulations: foul or turn passes.",
          ],
        },
        {
          id: "play",
          title: "Gameplay",
          bullets: [
            "Hit only your balls; \"legal shot\" — first contact your ball, then ball to cushion or in pocket.",
            "Call pocket — often mandatory on every legal pot; 8 called separately.",
            "Run continues until miss or foul.",
            "Safety play — leave opponent a hard position without an obvious foul.",
          ],
        },
        {
          id: "eight",
          title: "Playing the 8",
          bullets: [
            "8 may be hit only after legally clearing all your balls.",
            "Call pocket before the shot; wrong pocket or foul — loss.",
            "8 in pocket with cue ball on foul — loss.",
            "Tied match — \"golden break\" or replay per regulations.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "After foul — ball in hand to opponent (where you may place — per league).",
            "Three consecutive fouls without hitting your own — loss of frame (per professional league regulations).",
            "Miss, cue ball in pocket, ball off table, double hit, push shot.",
            "Hitting opponent's ball or early shot on 8 — foul or loss.",
          ],
        },
        {
          id: "vs-pool",
          title: "Difference from classic eight-ball",
          bullets: [
            "Stricter break: more balls to cushion or legal pot required.",
            "Call pocket often mandatory for the whole visit, not only on the 8.",
            "Three consecutive fouls — typical tournament loss; rarer in club pool.",
            "9 ft table — league standard; tactics closer to positional than bar 8 ft.",
          ],
        },
      ],
    },
  ],
};

export const CHINESE_POOL_TABLE_EN = withBilliardHistory(
  CHINESE_POOL_TABLE_BASE,
  CHINESE_POOL_TABLE_HISTORY_EN,
  CHINESE_POOL_GAME_HISTORIES_EN,
);
