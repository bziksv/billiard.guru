import type { BilliardHistory, BilliardTableType } from "@/lib/billiard-rules/content";
import { withBilliardHistory } from "@/lib/billiard-rules/history/attach-history";

const POOL_TABLE_HISTORY_EN: BilliardHistory = {
  title: "History and geography of pool",
  intro:
    "Pool is the global standard of pocket billiards: 57 mm balls, wide pockets, side pockets on the short rail. Below — from European billiards in 19th-century America to WPA, bar eight-ball, and Asian dominance in nine-ball and ten-ball.",
  sections: [
    {
      id: "origins-america",
      title: "Who \"invented\" pool and where it came from",
      paragraphs: [
        "There is no single \"inventor of pool.\" Pocket billiards grew in the United States in the 19th century from European pocket games brought across the Atlantic by immigrants and traders. Six-pocket tables, balls smaller than pyramid balls, emphasis on runs and combinations — an American evolution, not a copy of one European game.",
        "The first American halls appeared in the late 1800s in New York, Chicago, and other cities. Manufacturers such as Brunswick (founded 1845) mass-produced 7–10 ft tables; rules differed hall by hall until associations began to unify them.",
        "Eight-ball, nine-ball, and straight pool (14.1) are different branches of one table, taking shape in the first half of the 20th century. Ten-ball is a later \"tournament\" discipline with mandatory call pocket.",
      ],
    },
    {
      id: "chronology",
      title: "Chronology",
      table: {
        headers: ["Period", "Event"],
        rows: [
          ["19th century", "Pocket billiards in American halls; growth of table production"],
          ["1900s–1930s", "Eight-ball and straight pool take shape; \"golden era\" of 14.1"],
          ["1960s–1970s", "Nine-ball becomes a televised format"],
          ["1987", "WPA (World Pool-Billiard Association) founded — unified international rules"],
          ["1990s–2000s", "Asian boom: Philippines, China, Taiwan — top of world pool"],
          ["2000s — present", "Ten-ball as a \"fair\" alternative to nine-ball; prize growth in Asia"],
        ],
      },
    },
    {
      id: "wpa-standard",
      title: "WPA and the table standard",
      paragraphs: [
        "The World Pool-Billiard Association (WPA) and national federations (in the USA — BCA and others) unify rules for tournaments. Tournament standard — 9 ft table, 57.15 mm (2¼″) balls, six pockets (side pockets on the short rail — not to be confused with pyramid).",
        "Clubs favor 8 ft and 7 ft tables; bar eight-ball is often played under simplified \"house\" rules on break and ball-in-hand — they may differ from WPA.",
        "On billiard.guru the \"pool\" format is listed separately from pyramid and Chinese pool; the tournament card specifies the discipline (eight-ball, nine-ball, etc.).",
      ],
      table: {
        headers: ["Organization", "Role"],
        rows: [
          ["WPA", "International rules, world championships"],
          ["EPBF (Europe)", "European tours and rankings"],
          ["National federations", "National championships, club leagues"],
        ],
      },
    },
    {
      id: "disciplines-overview",
      title: "Four disciplines on one table",
      table: {
        headers: ["Discipline", "Essence", "Where it is mass-market"],
        rows: [
          ["Eight-ball", "Solids 1–7 or stripes 9–15, then black 8", "Bars, clubs, amateur leagues worldwide"],
          ["Nine-ball", "Balls 1–9 in order; win on the 9", "Pro tour, Asia, USA"],
          ["Ten-ball", "Balls 1–10, call on every shot", "China, Hong Kong, elite WPA series"],
          ["Straight pool (14.1)", "Race to 100/150, any ball with call", "USA, historical niche, film \"The Color of Money\""],
        ],
      },
      note: "Full regulations and history of each discipline — on a separate page at /rules/pool/…",
    },
    {
      id: "geography",
      title: "Geography: where pool is the main billiards game",
      table: {
        headers: ["Region", "Level", "Schools and formats"],
        rows: [
          ["USA", "Very high", "Birthplace of disciplines; eight-ball in bars, nine-ball on TV"],
          ["Philippines, China, Taiwan", "Very high", "Nine-ball, ten-ball, academies, major prize money"],
          ["Europe (UK, DE, ES…)", "High", "EPBF, 8 ft and 9 ft clubs, eight-ball"],
          ["Latin America", "High", "Eight-ball in bars and sports halls"],
          ["Russia", "Medium–high", "Major cities; second table after pyramid; eight-ball and nine-ball"],
          ["Middle East, Southeast Asia", "Growing", "8 ft club networks, WPA tournaments"],
        ],
      },
    },
    {
      id: "culture-media",
      title: "Culture, film, television",
      paragraphs: [
        "Eight-ball is the symbol of bar billiards in the USA and Europe: the \"pool hall\" as social space. Nine-ball and ten-ball are televised and professional sports with multi-million prizes in Asia.",
        "The film \"The Color of Money\" (1986) with Paul Newman and Tom Cruise is a cultural icon of straight pool. ESPN, Matchroom, and Asian leagues broadcast nine-ball and ten-ball worldwide.",
        "In Russia pool sits alongside pyramid in larger halls; on billiard.guru clubs mark the format separately. Players often start with eight-ball and move to nine-ball for rating tournaments.",
      ],
      bullets: [
        "Cue ball in pocket — foul in all major pool disciplines (unlike free pyramid).",
        "\"Ball in hand\" after a foul — WPA standard; in bars play is sometimes \"anywhere on the table\".",
        "Three consecutive fouls without a legal hit — loss of frame (tournament rule in nine-ball/ten-ball).",
      ],
    },
    {
      id: "trends",
      title: "What is changing now",
      bullets: [
        "Ten-ball with mandatory call pocket — growth in Asia and on WPA world series.",
        "7 ft tables in family entertainment centers; 9 ft — tournament standard.",
        "Women's and paralympic pool — programs of national federations.",
        "Streams and shot clock — short matches for online audiences.",
        "In Russia — growth of club series in nine-ball and eight-ball on billiard.guru.",
      ],
    },
  ],
};

const POOL_GAME_HISTORIES_EN: Record<string, BilliardHistory> = {
  "8-ball": {
    title: "Historical note: eight-ball",
    intro:
      "Eight-ball (8-ball) is the most recognizable pool format in the world: 15 balls, two groups (solids and stripes), final black 8. Symbol of bar billiards since the 20th century.",
    sections: [
      {
        id: "origins",
        title: "Who invented it and when",
        paragraphs: [
          "Eight-ball took shape in the USA in the first half of the 20th century from earlier \"pool\" games with 15 balls. No exact date or author is recorded — rules evolved in halls and were printed in table manufacturers' booklets.",
          "By the 1960s the format became the standard of American bars: group assignment after the first legal pot, clearing your balls, legal 8 in the called pocket. BCA and later WPA codified the tournament version.",
          "In Russia eight-ball arrived with pool tables in the 1990s–2000s; it is often mixed with local \"house\" break rules (4 balls to cushion, ball in hand anywhere on the table).",
        ],
      },
      {
        id: "rules-evolution",
        title: "Evolution of regulations",
        bullets: [
          "Break: cue ball behind the head string; minimum 4 balls to cushion or legal pot — per WPA.",
          "Group (solids/stripes) determined by first legal pot or on a split — per regulations.",
          "Early shot on the 8 or 8 in wrong pocket — loss.",
          "Cue ball in pocket — foul; opponent spots \"ball in hand\" behind the head string (or anywhere on the table — in bars).",
        ],
      },
      {
        id: "geography",
        title: "Geography",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["USA, UK, Australia", "Mass bar culture, amateur leagues"],
            ["Russia", "Second most common table after pyramid in major cities"],
            ["Europe, Latin America", "7–8 ft clubs, evening tournaments"],
            ["Asia", "Alongside nine-ball; eight-ball for mass-market clubs"],
          ],
        },
      },
      {
        id: "culture",
        title: "Culture and media",
        paragraphs: [
          "Eight-ball is the first game presented as \"pool\" in film and games. Low entry barrier, clear rules, short frame.",
          "Tournament eight-ball per WPA is stricter than bar play: referee, fixed break, foul penalties.",
        ],
      },
      {
        id: "trends",
        title: "The present day",
        bullets: [
          "Club series in Russia on billiard.guru — frequent format for beginners.",
          "Parallel with Chinese eight-ball: stricter break and call pocket there.",
          "8 ft tables — standard of mass-market clubs; 9 ft — for serious tournaments.",
        ],
      },
    ],
  },
  "9-ball": {
    title: "Historical note: nine-ball",
    intro:
      "Nine-ball is the tournament \"rotation\" discipline: balls 1–9, win on the 9. Symbol of modern professional pool and televised series since the 1970s.",
    sections: [
      {
        id: "origins",
        title: "Origins",
        paragraphs: [
          "Nine-ball originated in the USA in the early 20th century as a fast game on nine balls. The rule \"first contact the lowest number on the table\" and winning by combination on the 9 made the discipline spectacular.",
          "From the 1970s — backbone of televised pool: short frames, power break, pace. WPA World Nine-ball Championship and Matchroom series brought the discipline to a global level.",
          "The Philippines produced nine-ball legends (Parreño, Bustamante, Chi); from the 2000s China and Taiwan are centers of prize money and academies.",
        ],
      },
      {
        id: "rules-key",
        title: "Key rules and differences",
        bullets: [
          "Cue ball must first contact the lowest number on the table.",
          "You can win by combination: the 9 goes \"on the chain\" after a legal hit.",
          "\"Ball on\": cue ball and object ball on different halves of the table (head string).",
          "Three consecutive fouls — loss of frame (WPA tournament rule).",
          "Cue ball in pocket — foul; ball in hand to opponent.",
        ],
      },
      {
        id: "geography",
        title: "Where nine-ball is strong",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["Philippines, China, USA", "Top players in the world, largest prize pools"],
            ["Europe", "EPBF, national tours, qualifiers for world series"],
            ["Russia", "Club tournaments, preparation for international formats"],
            ["Southeast Asia", "Growth alongside ten-ball in academies"],
          ],
        },
      },
      {
        id: "media",
        title: "Television and the professional tour",
        paragraphs: [
          "Nine-ball is the main format of ESPN, Matchroom, and Asian league broadcasts. Shot clock, short racks, break \"on the fly\" — hallmarks of the discipline.",
          "In Russia nine-ball is more popular than straight pool; tournaments on billiard.guru often use this format.",
        ],
      },
      {
        id: "trends",
        title: "Trends",
        bullets: [
          "Prize growth in China and on world series.",
          "\"Shot clock\" formats and matches to 5 frames for streams.",
          "Young players from Russia — qualifiers for WPA and European tours.",
        ],
      },
    ],
  },
  "10-ball": {
    title: "Historical note: ten-ball",
    intro:
      "Ten-ball is an official WPA discipline with call ball and pocket on every shot. A \"fair\" alternative to nine-ball: fewer disputed lucky pots.",
    sections: [
      {
        id: "origins",
        title: "When it appeared",
        paragraphs: [
          "Ten-ball adds a tenth ball to nine-ball and requires naming ball and pocket before the shot — similar to strict carom disciplines and snooker.",
          "WPA has promoted ten-ball as the basis of professional series since the 2000s, especially in Asia where disputed pots in nine-ball were criticized by viewers and players.",
          "Rules are close to nine-ball in ball order, but call makes every shot \"intentional\" for the referee and broadcast.",
        ],
      },
      {
        id: "vs-9-ball",
        title: "Ten-ball vs nine-ball",
        table: {
          headers: ["", "Nine-ball", "Ten-ball"],
          rows: [
            ["Call", "Not required (except push-out and regulations)", "Required on every shot"],
            ["Balls", "9", "10"],
            ["Lucky pot", "Allowed with legal first contact", "Only called ball in called pocket"],
            ["Geography", "Global", "Stronger in Asia and elite series"],
          ],
        },
      },
      {
        id: "geography",
        title: "Geography",
        bullets: [
          "China and Hong Kong — mass tournaments, television.",
          "Europe and USA — elite WPA series.",
          "Russia — growing in clubs preparing players for international formats.",
          "On billiard.guru ten-ball appears less often than eight-ball and nine-ball.",
        ],
      },
      {
        id: "trends",
        title: "The present day",
        bullets: [
          "WPA World 10-Ball Championship — flagship of the discipline.",
          "Asian leagues include ten-ball alongside nine-ball.",
          "Players with nine-ball experience adapt to call in 1–2 seasons.",
        ],
      },
    ],
  },
  "straight-pool": {
    title: "Historical note: straight pool",
    intro:
      "Straight pool (14.1, continuous pool) — classic American billiards: race to 100 or 150 points, \"endless\" rack, rerack when one ball remains.",
    sections: [
      {
        id: "origins",
        title: "Golden age of 14.1",
        paragraphs: [
          "Straight pool is one of the oldest organized games on the American table. Any ball in any pocket with call; when one ball remains, a rack of 14 is set again touching the remaining ball.",
          "Golden era — 1920s–1960s: Ralph Greenleaf, Willie Mosconi, televised matches. The film \"The Color of Money\" (1986) brought 14.1 back into mass culture.",
          "Today — a niche, but respected school of position play, break shots, and rack management.",
        ],
      },
      {
        id: "rules-key",
        title: "Essence of the rules",
        bullets: [
          "Call ball and pocket on every shot.",
          "Frame to 100, 125, or 150 points — per regulations.",
          "Rack break: 14 balls in a triangle, one ball stays; break the rack without a foul.",
          "Touching balls when setting the rack — foul.",
          "Cue ball in pocket — foul; ball in hand to opponent.",
        ],
      },
      {
        id: "geography",
        title: "Where it is played",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["USA", "Historic clubs, retro tournaments, 14.1 enthusiasts"],
            ["Europe", "Combined programs, amateur leagues"],
            ["Russia", "Rare in clubs; more often among players with pool experience abroad"],
            ["Asia", "Almost absent; focus on nine-ball and ten-ball"],
          ],
        },
      },
      {
        id: "culture",
        title: "Culture",
        paragraphs: [
          "14.1 is a \"mastery school\" for position and planning a 40+ ball run. Young players often start with eight-ball/nine-ball and discover straight pool later.",
          "14.1 tournaments are held, but the audience is smaller than for nine-ball.",
        ],
      },
      {
        id: "trends",
        title: "The present day",
        bullets: [
          "Retro interest after streams of classic matches.",
          "WPA periodically includes 14.1 in championship programs.",
          "In Russia — individual enthusiasts and exhibition matches.",
        ],
      },
    ],
  },
};

/** Pool — extended content for /en/rules/pool. Specs per World Pool-Billiard Association (WPA). */
const POOL_TABLE_BASE: BilliardTableType = {
  id: "POOL",
  slug: "pool",
  title: "Pool",
  lead: "Six-pocket table: play by number, by group, or in rotation — from eight-ball to straight pool.",
  teaser: "Eight-ball, nine-ball, ten-ball, and straight pool on 7–9 ft tables.",
  pockets: true,
  pocketsLabel: "6 pockets",
  seo: {
    title: "Pool — rules, table specs and game formats",
    description:
      "Pool reference guide: eight-ball, nine-ball, ten-ball, straight pool (14.1). 7–9 ft table, 57.15 mm balls, six pockets. For players and referees.",
    keywords: [
      "pool rules",
      "pocket billiards",
      "8-ball rules",
      "9-ball rules",
      "10-ball rules",
      "straight pool 14.1",
      "WPA pool",
      "9 ft pool table",
    ],
  },
  specs: [
    { label: "Pockets", value: "6 (wide)" },
    { label: "Balls", value: "15 + cue ball" },
    { label: "Table size", value: "7–9 ft" },
    { label: "Ball diameter", value: "57,15 mm (2¼″)" },
  ],
  overview: [
    "Pool is a family of games on a rectangular table with six pockets. Side pockets sit on the short rails; balls are smaller and lighter than pyramid balls, pockets wider — combinations and power play are easier.",
    "Clubs most often have 8 ft and 9 ft tables. The game format (eight-ball, nine-ball, ten-ball, straight pool) is specified on the tournament card on billiard.guru.",
  ],
  equipment: {
    title: "Table, ball, and pocket specs",
    intro:
      "Tournament standard — 9 ft per World Pool-Billiard Association (WPA) rules. Clubs favor 8 ft; 7 ft tables — for training and casual play.",
    groups: [
      {
        title: "Playing surface and table",
        table: {
          headers: ["Parameter", "9 ft (tournament)", "8 / 7 ft (club)"],
          rows: [
            ["Playing surface", "2540 × 1270 mm", "2240 × 1120 / 1980 × 990 mm"],
            ["Overall table size", "≈ 2900 × 1630 mm", "≈ 2600 × 1450 / 2300 × 1300 mm"],
            ["Height from floor", "≈ 750–800 mm", "≈ 750 mm"],
            ["Markings", "Kitchen, head string, center spot", "Same elements"],
          ],
        },
      },
      {
        title: "Balls",
        table: {
          headers: ["Parameter", "Standard", "Note"],
          rows: [
            ["Set", "16 balls", "15 object balls + 1 cue ball"],
            ["Object balls", "1–7 solids, 9–15 stripes, 8 black", "In eight-ball — groups by color"],
            ["Cue ball", "White, no number", "In pocket on break — foul or turn passes"],
            ["Diameter", "57,15 mm (2¼″)", "≈ 170 g per ball"],
            ["Material", "Phenolic resin", "Set uniformity required"],
          ],
        },
      },
      {
        title: "Pockets",
        table: {
          headers: ["Pocket type", "Feature"],
          rows: [
            ["Corner (4)", "At rail intersections; \"bags\" with trimmed corners"],
            ["Side on short rail (2)", "Not to be confused with pyramid: side pockets — on the short side"],
            ["Width", "Noticeably wider than the ball — power shots and \"cut\" pots allowed"],
            ["Ball return", "Under each pocket; balls not returned until end of frame"],
          ],
        },
      },
    ],
    note: "Before a tournament, check cloth level, cushion condition, and ball uniformity. Clubs may allow small deviations — ask the administrator.",
  },
  checklist: {
    title: "Pre-game or pre-tournament checklist",
    intro: "Go through these at the table — fewer disputes about regulations and equipment.",
    items: [
      {
        text: "Discipline confirmed",
        hint: "Eight-ball, nine-ball, ten-ball, or straight pool — per tournament card or agreement.",
      },
      {
        text: "Match format",
        hint: "To N wins, to 7/9 frames, to 100 points — in the event description on billiard.guru.",
      },
      {
        text: "Table size",
        hint: "7, 8, or 9 ft; on 9 ft combinations are longer, on 7 ft — tighter layout.",
      },
      {
        text: "Pool balls, set of 16",
        hint: "Diameter ≈ 57 mm, white cue ball; no chips or large bounce differences.",
      },
      {
        text: "Head string and kitchen",
        hint: "Cue ball on break fully behind the head string; on ball-in-hand — in kitchen or on line per regulations.",
      },
      {
        text: "Break rules",
        hint: "Eight-ball — 4 balls to cushion or legal pot; nine-ball/ten-ball — contact the 1 and cue ball past head string.",
      },
      {
        text: "Call ball and pocket",
        hint: "Ten-ball — required on every shot; eight-ball and nine-ball — only on final balls or per regulations.",
      },
      {
        text: "Ball off table",
        hint: "Spot on line or at point; penalty — ball in hand to opponent.",
      },
    ],
  },
  commonFouls: [
    "Cue ball did not first contact the required ball or went in a pocket.",
    "Object ball did not reach a cushion and was not potted (no \"legal shot\").",
    "Shot from wrong half of table — in nine-ball and ten-ball (\"ball on\" violation).",
    "Double hit, push shot, touching a ball by hand or cue outside the stroke zone.",
    "Jump shot — cue ball not touching cloth at moment of strike.",
    "Wrong ball or wrong pocket — in ten-ball and on called shots in eight-ball.",
    "Touching balls before the shot, shot not on cue ball, transferring stroke to opponent's ball.",
  ],
  games: [
    {
      slug: "8-ball",
      title: "Eight-ball (classic pool)",
      subtitle: "Classic pool · solids and stripes",
      badge: "Club classic",
      tagline:
        "Clear all your balls (1–7 or 9–15), then legally pot the black 8. The most popular format in the hall.",
      seo: {
        title: "Eight-ball (8-ball) — pool rules",
        description:
          "Eight-ball rules: solids and stripes, group assignment, legal 8 in called pocket, break, fouls and ball in hand. Classic bar and tournament pool.",
        keywords: [
          "8-ball rules",
          "eight ball pool",
          "solids stripes",
          "pool eight ball",
          "WPA 8-ball",
          "call pocket 8 ball",
          "pool break rules",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Each player pots their group — solids (balls 1–7) or stripes (9–15), then legally pots ball 8 in the called pocket.",
            "Loss — if the 8 goes in before your group is cleared, with a foul, or in the wrong pocket. Match format (to 1, 3, 5 wins) is set by the organizer.",
          ],
          bullets: [
            "Table is \"open\" until a group is set by the first legal pot.",
            "Black 8 stays on the table until the end — you cannot pot it before your own balls.",
          ],
        },
        {
          id: "setup",
          title: "Setup and break",
          bullets: [
            "15 balls — triangle on the foot spot; cue ball — in kitchen behind head string.",
            "Power break: cue ball must hit the rack; minimum 4 balls — to cushion or in pocket (per pool association or hall regulations).",
            "First shot — by lot or \"lag\".",
            "Cue ball in pocket on break — foul; opponent ball in hand anywhere behind head string.",
          ],
        },
        {
          id: "groups",
          title: "Group assignment",
          bullets: [
            "Group is set by first legally potted ball (except the 8).",
            "If both types are potted on an open table — player chooses group.",
            "If group is not set after break — table stays open until next legal pot.",
            "Opponent's ball accidentally potted — penalty or turn passes per hall regulations.",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "Hit only your balls; after the last of yours — shot on the 8.",
            "8 must be called and pocket named before the shot — mandatory in tournaments.",
            "Run continues while you pot or opponent gets a turn after your miss.",
            "\"Legal shot\": first contact — your ball; after the shot any ball touches cushion or goes in pocket.",
          ],
        },
        {
          id: "eight",
          title: "Playing the 8",
          bullets: [
            "8 can be hit only after legally clearing all your balls.",
            "8 in wrong pocket or with a foul — loss.",
            "8 in pocket with cue ball on a foul — loss.",
            "On time tie — replay or \"golden break\" per regulations.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Miss on your balls, cue ball in pocket, ball off table.",
            "First contact on opponent's ball.",
            "Double hit, push shot, shot not from cloth.",
            "After foul opponent — ball in hand: cue ball anywhere behind head string (or anywhere on table — per regulations).",
          ],
        },
      ],
    },
    {
      slug: "9-ball",
      title: "Nine-ball (rotation pool)",
      subtitle: "Rotation pool · nine balls",
      badge: "Tournament",
      tagline:
        "Balls 1–9 in a diamond on the table. Pot in ascending order; win — legal 9.",
      seo: {
        title: "Nine-ball (9-ball) — pool rules",
        description:
          "Nine-ball rules: balls 1–9 in order, lowest ball on, combination on 9, push-out, three fouls, break and ball in hand. WPA tournament pool.",
        keywords: [
          "9-ball rules",
          "nine ball pool",
          "rotation pool",
          "WPA 9-ball",
          "push out",
          "pool break 9 ball",
          "ball on nine ball",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "First to legally pot ball 9. Only nine balls on the table; play strictly by number — first 1, then 2, and so on.",
            "You can win by combination: if cue ball first contacts the lowest number on the table, the 9 can go in \"on the chain\".",
          ],
          bullets: [
            "Tournament format: to 7, 9, or 11 wins — race to N frames.",
            "Format is listed on the event card on billiard.guru.",
          ],
        },
        {
          id: "setup",
          title: "Setup and break",
          bullets: [
            "Balls 1–9 in a diamond: 1 on foot spot, 9 in center; others — by lot or template.",
            "Power break: first contact — ball 1; after shot minimum 4 balls to cushion or any ball in pocket.",
            "Cue ball must cross head string or return to kitchen / touch cushion — per pool association regulations.",
            "Illegal break — ball in hand to opponent.",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "\"Ball on\" — lowest number on the table; cue ball must contact it first.",
            "Any ball counts if contact order is correct; 9 can be winning at any time.",
            "Shot from wrong half of table — foul (cue ball crossed head string incorrectly).",
            "After foul — ball in hand; opponent may place cue ball anywhere (in tournaments — often behind head string only).",
          ],
        },
        {
          id: "push",
          title: "Push-out after break",
          paragraphs: [
            "After the break opponent may declare \"push-out\" — a shot without obligation to drive a ball to cushion or pot.",
          ],
          bullets: [
            "Push-out allowed only immediately after break and only for incoming player.",
            "Opponent decides: shoot themselves or return the shot to breaker.",
            "Push-out rules depend on tournament regulations — confirm before the match.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Did not first contact \"ball on\".",
            "Cue ball in pocket, ball off table, double hit, push shot.",
            "Shot when only 9 remains without cushion contact (if not potted).",
            "Three consecutive fouls on one visit — loss of frame (pool association tournament rule).",
          ],
        },
      ],
    },
    {
      slug: "10-ball",
      title: "Ten-ball (call-shot pool)",
      subtitle: "Rotation pool · call shot",
      badge: "Call shot",
      tagline:
        "Like nine-ball, but ten balls. Before every shot — call ball and pocket; lucky pots do not count.",
      seo: {
        title: "Ten-ball (10-ball) — pool rules",
        description:
          "Ten-ball rules: balls 1–10, mandatory call on every shot, rotation order, fouls and ball in hand. WPA professional discipline.",
        keywords: [
          "10-ball rules",
          "ten ball pool",
          "call shot pool",
          "WPA 10-ball",
          "pool call pocket",
          "rotation ten ball",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective",
          paragraphs: [
            "Legally pot ball 10. Play balls 1–10 in order; 10 is the winning ball.",
            "Every scoring shot — with explicit call: which ball and which pocket (or \"any\" — if regulations allow).",
          ],
          bullets: [
            "Lucky pots do not count — only the declared combination.",
            "Official pool association discipline; popular on professional tournaments.",
          ],
        },
        {
          id: "setup",
          title: "Setup and break",
          bullets: [
            "Balls 1–10 in triangle: 1 on foot spot, 10 in center.",
            "Break — as in nine-ball: first contact ball 1, cue ball behind head string.",
            "Illegal break — ball in hand to opponent.",
          ],
        },
        {
          id: "call",
          title: "Call and scoring",
          bullets: [
            "Before shot name ball and pocket; caroms and cushions — also declare if part of the plan.",
            "Wrong ball or wrong pocket — ball spotted, turn passes.",
            "First contact — lowest number on table; otherwise foul.",
            "10 can be called only when all lower balls are cleared or per combination rules.",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "Ball order as in nine-ball; difference — strict pocket call on every score.",
            "Safety play: leave opponent a hard position without an obvious foul.",
            "Run — while you pot called balls.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Uncalled ball in pocket, wrong \"ball on\", cue ball in pocket.",
            "Ball off table — spot and ball in hand.",
            "Three consecutive fouls — loss (per pool association regulations).",
          ],
        },
      ],
    },
    {
      slug: "straight-pool",
      title: "Straight pool (14.1)",
      subtitle: "Point race · continuous rack",
      badge: "Classic",
      tagline:
        "Every potted ball — one point. When one ball remains — the other 14 return in a rack.",
      seo: {
        title: "Straight pool (14.1) — rules",
        description:
          "Straight pool 14.1 rules: race to 100/150 points, call pocket, rack break, position play. Classic American continuous pool.",
        keywords: [
          "straight pool rules",
          "14.1 pool",
          "continuous pool",
          "straight pool 100 points",
          "rack break pool",
          "call pocket straight pool",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Reach 100, 125, or 150 points (per regulations) before opponent. Every legally potted ball — 1 point.",
            "Classic American billiards discipline; requires position play and rack-break planning.",
          ],
          bullets: [
            "Tournaments: to 100 or 150 points; a match can last several hours.",
            "Format on billiard.guru — see event card.",
          ],
        },
        {
          id: "setup",
          title: "Setup",
          bullets: [
            "15 balls — tight triangle on foot spot; cue ball — in kitchen.",
            "First shot — break or ball in hand per regulations.",
            "Any ball may be played — no groups.",
          ],
        },
        {
          id: "rerack",
          title: "Rack break (rerack)",
          paragraphs: [
            "When one object ball remains, it stays in place, the other 14 return in a rack — play continues.",
          ],
          bullets: [
            "Rack set without touching the remaining ball; if touched — foul.",
            "Player breaking the rack plans cue ball position for the next run.",
            "Typical tactic: take 3–5 balls per visit, then controlled rack break.",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "Call ball and pocket — on every shot.",
            "\"Legal shot\": any ball in pocket or cushion contact after contact.",
            "Safety — leave cue ball and balls so opponent cannot start a run.",
            "Score on display or marker; referee records disputed situations.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Miss, cue ball in pocket, ball off table — ball in hand to opponent.",
            "Uncalled ball in pocket — ball spotted, −1 point or penalty per regulations.",
            "Touching balls when setting rack — foul.",
            "Double hit, push shot, shot not from cloth.",
          ],
        },
      ],
    },
  ],
};

export const POOL_TABLE_EN = withBilliardHistory(
  POOL_TABLE_BASE,
  POOL_TABLE_HISTORY_EN,
  POOL_GAME_HISTORIES_EN,
);
