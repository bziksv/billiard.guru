import type { BilliardHistory, BilliardTableType } from "@/lib/billiard-rules/content";
import { withBilliardHistory } from "@/lib/billiard-rules/history/attach-history";

const CAROM_TABLE_HISTORY_EN: BilliardHistory = {
  title: "History and geography of carom billiards",
  intro:
    "Carom billiards — pocketless table, three balls, cushion rebounds, geometry of the stroke. Below — French roots of the 18th–19th centuries, Belgian–Dutch three-cushion, UMB, and the Asian breakthrough in the 21st century.",
  sections: [
    {
      id: "origins-france",
      title: "Who invented carom and where the name comes from",
      paragraphs: [
        "Carom billiards (fr. carambole) originated in France in the 18th–19th centuries as a game on a rectangular pocketless table with three balls. The name comes from the carom stroke: cue ball rebounds off a cushion and contacts the second object ball.",
        "No single \"inventor\" is recorded; the game evolved from earlier European billiard games on pocketless tables. France, Belgium, and the Netherlands are the cradle of the disciplines.",
        "Straight rail (contacting two balls) preceded three-cushion. Cadre — play in a limited zone on the same table.",
      ],
    },
    {
      id: "chronology",
      title: "Chronology",
      table: {
        headers: ["Period", "Event"],
        rows: [
          ["18th–19th century", "Carom in France and Benelux; pocketless tables"],
          ["Late 19th century", "Three-cushion — requirement of three cushion contacts"],
          ["1958", "UMB (Union Mondiale de Billard) founded — world carom federation"],
          ["20th century", "Dominance of Belgium, Netherlands, France; later Turkey, Egypt"],
          ["2000s — present", "Asia: Korea, Vietnam, Japan — champions and prize money"],
          ["Present", "Three-cushion at World Games; not Olympic, but with UMB World Championship"],
        ],
      },
    },
    {
      id: "umb-disciplines",
      title: "UMB and three disciplines on one table",
      paragraphs: [
        "Union Mondiale de Billard (UMB) unites carom billiards and coordinates rules with WPA for pool. 10 ft table (≈ 2.84 × 1.42 m) — no pockets; three balls (cue ball + two object balls, usually white and yellow/red).",
        "On one table players compete in three-cushion, straight rail, and cadre — different scoring rules and playing zones.",
      ],
      table: {
        headers: ["Discipline", "Scoring", "Difficulty"],
        rows: [
          ["Three-cushion", "Cue ball contacts 3+ cushions and two object balls", "Highest; UMB world championships"],
          ["Straight rail", "Contact with two object balls", "Basic; training, clubs"],
          ["Cadre", "Points only inside a rectangular zone on the table", "European specialty"],
        ],
      },
    },
    {
      id: "geography",
      title: "Geography",
      table: {
        headers: ["Region", "Level", "Comment"],
        rows: [
          ["Belgium, Netherlands", "Very high", "Three-cushion school; club tradition for centuries"],
          ["France, Spain, Portugal", "High", "Cadre, straight rail, national tours"],
          ["Turkey, Egypt", "High", "Strong national teams, world champions"],
          ["Korea, Vietnam, Japan", "Medium–high", "Asian breakthrough in three-cushion from the 1990s"],
          ["Russia", "Niche", "Individual tables, sections, enthusiasts"],
          ["USA", "Niche", "Historical carom diaspora"],
        ],
      },
    },
    {
      id: "culture",
      title: "Culture and difference from pocket billiards",
      paragraphs: [
        "Carom is \"mathematical\" billiards: trajectories, systems, spin. No pockets — no \"lucky\" ball drop; every miss is visible immediately.",
        "In Russia carom is seen as \"European\" billiards; mass halls focus on pyramid and pool. 10 ft pocketless tables are rare. On billiard.guru carom is a separate table type.",
        "UMB broadcasts, trajectory video analysis, and stroke simulators — part of modern three-cushion culture.",
      ],
      bullets: [
        "No pockets — cue ball \"in pocket\" foul does not apply; fouls — miss, double hit, push shot.",
        "Three-cushion — World Games program discipline.",
        "In Russia targeted growth through sports schools and UMB contacts.",
      ],
    },
    {
      id: "trends",
      title: "What is changing now",
      bullets: [
        "Asia invests in three-cushion — competition with Europe for titles.",
        "Short match formats for television.",
        "UMB match streams with trajectory breakdown.",
        "In Russia — occasional tournaments and amateur tables in Moscow/St. Petersburg.",
      ],
    },
  ],
};

const CAROM_GAME_HISTORIES_EN: Record<string, BilliardHistory> = {
  trehband: {
    title: "Historical note: three-cushion",
    intro:
      "Three-cushion billiards — cue ball must rebound from at least three cushions and contact two object balls. The pinnacle of carom geometry and UMB's main discipline.",
    sections: [
      {
        id: "origins",
        title: "When three-cushion appeared",
        paragraphs: [
          "Three-cushion took shape in the late 19th century in Belgium and France. The three-cushion requirement made the game spectacular and difficult — accidental scoring is almost impossible.",
          "From the 20th century — UMB's main discipline. Champions from Belgium, Netherlands, France; from the 1990s — strong schools in Turkey, Egypt, Korea, and Vietnam.",
          "Match — to a set number of points (e.g. 40 or 50) or within innings limit; format depends on tournament.",
        ],
      },
      {
        id: "rules-key",
        title: "Rules in brief",
        bullets: [
          "Score: cue ball contacts 3+ cushions (or 3 rebounds) and both object balls.",
          "Fewer than three cushions with contact of two balls — no point.",
          "Cue ball contacts no ball — foul; change of innings.",
          "Double hit, push shot, touching by hand — foul.",
          "10 ft table, no pockets.",
        ],
      },
      {
        id: "geography",
        title: "Geography",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["Belgium, Netherlands", "Historic center; World Cup stages"],
            ["Turkey, Egypt", "Strong players 2000s–2020s"],
            ["Korea, Vietnam, Japan", "Asian champions and academies"],
            ["Russia", "Rare tournaments; enthusiasts on individual tables"],
          ],
        },
      },
      {
        id: "culture",
        title: "Three-cushion culture",
        paragraphs: [
          "Three-cushion is called \"chess of billiards\": a match can last hours, spectators follow stroke systems.",
          "Broadcasts with slow motion and trajectory graphics — UMB standard.",
        ],
      },
      {
        id: "trends",
        title: "Trends",
        bullets: [
          "Growth of Asian prize money and academies.",
          "Short formats (to 25 points) for TV.",
          "Simulators and apps for system training.",
        ],
      },
    ],
  },
  pryamoy: {
    title: "Historical note: straight rail",
    intro:
      "Straight rail — basic discipline: one point when cue ball contacts two object balls without mandatory cushion rebounds.",
    sections: [
      {
        id: "origins",
        title: "Precursor to three-cushion",
        paragraphs: [
          "Straight rail is the oldest form on a pocketless table. A point counts when cue ball after the stroke contacts two other balls (contact order — per UMB regulations).",
          "Used for training and club tournaments in France and Belgium; survives as amateur and practice format.",
          "Three-cushion grew from straight rail by adding the cushion requirement.",
        ],
      },
      {
        id: "rules-key",
        title: "Rules in brief",
        bullets: [
          "Score — contact with both object balls.",
          "No three-cushion requirement.",
          "Point match; change of innings after non-scoring stroke without foul.",
          "Foul — complete miss, double hit, push shot.",
        ],
      },
      {
        id: "geography",
        title: "Where it is played",
        bullets: [
          "France, Belgium — club tradition.",
          "USA — historical carom billiards niche.",
          "Russia — training before three-cushion in specialized sections.",
          "UMB tournaments — less often than three-cushion; more often national programs.",
        ],
      },
      {
        id: "vs-trehband",
        title: "Straight rail vs three-cushion",
        table: {
          headers: ["", "Straight rail", "Three-cushion"],
          rows: [
            ["Cushions", "Not required for score", "Minimum 3 rebounds"],
            ["Difficulty", "Lower", "Highest"],
            ["Audience", "Amateurs, training", "Professional UMB"],
          ],
        },
      },
      {
        id: "trends",
        title: "The present day",
        bullets: [
          "Foundation for youth carom sections.",
          "In Russia — entry discipline on individual tables.",
        ],
      },
    ],
  },
  kadre: {
    title: "Historical note: cadre",
    intro:
      "Cadre — play in a limited rectangular zone on a carom table; points only for strokes inside the \"box\".",
    sections: [
      {
        id: "origins",
        title: "European specialty",
        paragraphs: [
          "Cadre developed in France and Benelux alongside three-cushion. A rectangle (cadre) is marked on the table; scoring strokes — when both object balls are in the zone or cue ball enters per variant rules.",
          "Variants: 47/2, 52/2, etc. — numbers denote cadre size in cm and conditions. Requires different tactics than three-cushion: zone control, not long systems across the full table.",
          "UMB periodically includes cadre in continental tour programs.",
        ],
      },
      {
        id: "rules-key",
        title: "Essentials",
        bullets: [
          "Points only for strokes inside the cadre (per variant regulations).",
          "Stroke outside zone — no point or foul.",
          "Same 10 ft table, three balls, no pockets.",
          "Popular in France, Belgium, Netherlands.",
        ],
      },
      {
        id: "geography",
        title: "Geography",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["France, Belgium, Netherlands", "National cadre championships"],
            ["Russia", "Practically absent in mass segment"],
            ["Rest of world", "Niche; known to carom specialists"],
          ],
        },
      },
      {
        id: "culture",
        title: "Place in the carom family",
        paragraphs: [
          "Cadre is \"European classic\" for players who find three-cushion too punishing in tempo. Less spectator mass than three-cushion, but strong national tradition.",
        ],
      },
      {
        id: "trends",
        title: "The present day",
        bullets: [
          "Retained in UMB program at continental level.",
          "Not promoted widely in Russia.",
        ],
      },
    ],
  },
};

/** Carom billiards — extended content for /en/rules/carom. Specs per Union Mondiale de Billard (UMB). */
const CAROM_TABLE_BASE: BilliardTableType = {
  id: "CAROM",
  slug: "carom",
  title: "Carom billiards",
  lead: "Pocketless table: three balls, cushion rebounds, and points for precise contacts — pure stroke geometry.",
  teaser: "Three-cushion, straight rail, and cadre on fast cloth.",
  pockets: false,
  pocketsLabel: "No pockets",
  seo: {
    title: "Carom billiards — rules, disciplines and table specs",
    description:
      "Carom billiards reference: three-cushion, straight rail, cadre. 10 ft pocketless table, three 61.5 mm balls. For players and referees.",
    keywords: [
      "carom billiards rules",
      "carom billiards",
      "three-cushion",
      "3 cushion billiards",
      "straight rail",
      "cadre billiards",
      "pocketless table",
      "three cushions",
    ],
  },
  specs: [
    { label: "Pockets", value: "None" },
    { label: "Balls", value: "3 (2 white + red)" },
    { label: "Table size", value: "10 ft (≈ 2.84×1.42 m)" },
    { label: "Ball diameter", value: "61.5 mm (≈ 205 g)" },
  ],
  overview: [
    "Carom billiards is a family of games on a pocketless table. Points are scored for cue-ball contacts with object balls counting cushion rebounds; balls stay on the table until the end of the inning.",
    "The table is shorter than pyramid, cloth is faster — angle, speed, and position matter. Three-cushion is on continental and world championship programs.",
  ],
  equipment: {
    title: "Table and ball specs",
    intro:
      "Tournament standard — 10 ft per Union Mondiale de Billard (UMB) rules. Clubs often use 9 ft tables; small deviations are acceptable for training.",
    groups: [
      {
        title: "Playing surface and table",
        table: {
          headers: ["Parameter", "10 ft (tournament)", "9 ft (club)"],
          rows: [
            ["Playing surface", "2840 × 1420 mm", "2540 × 1270 mm"],
            ["Overall table size", "≈ 3200 × 1700 mm", "≈ 2900 × 1550 mm"],
            ["Height from floor", "≈ 800 mm", "≈ 800 mm"],
            ["Markings", "D-zone, baulk line, center spot", "Same elements"],
            ["Cloth", "Fast, low nap", "Halls — unified standard"],
          ],
        },
      },
      {
        title: "Balls",
        table: {
          headers: ["Ball", "Qty", "Role"],
          rows: [
            ["White (player A)", "1", "First player's cue ball"],
            ["Spotted white (player B)", "1", "Second player's cue ball; distinct from plain white"],
            ["Red", "1", "Object ball, shared by both"],
            ["Diameter", "61.5 mm", "≈ 205 g; heavier than pool balls"],
            ["Material", "Phenolic resin", "Set uniformity required"],
          ],
        },
      },
      {
        title: "Cushions and pockets",
        table: {
          headers: ["Element", "Feature"],
          rows: [
            ["Pockets", "None", "Balls are not potted — contacts only"],
            ["Corners", "Cut \"bags\"", "Rebounds more predictable than on old tables"],
            ["Middle spots", "Marks on cushions", "For setup and cadre"],
            ["D-zone", "Semicircle at baulk line", "Starting cue-ball position"],
          ],
        },
      },
    ],
    note: "Before a match, check cloth flatness, cushion condition, and ball uniformity. Red and both whites must be easily distinguishable on the table.",
  },
  checklist: {
    title: "Pre-game or pre-tournament checklist",
    intro: "Go through these at the table — fewer disputes about rules and equipment.",
    items: [
      {
        text: "Discipline confirmed",
        hint: "Three-cushion, straight rail, or cadre — per tournament card or agreement.",
      },
      {
        text: "Inning format",
        hint: "To 15, 25, 40, or 50 points; match to N games — in event description on billiard.guru.",
      },
      {
        text: "Whose cue ball",
        hint: "Plain white and spotted white — assign to players before the lot.",
      },
      {
        text: "Starting setup",
        hint: "Red on center spot; cue ball in D-zone or on baulk line per regulations.",
      },
      {
        text: "Scoring rule",
        hint: "Three-cushion: 3 cushions + 2 balls; straight rail: 2 balls; cadre: zone on table.",
      },
      {
        text: "Time limit",
        hint: "Per shot or per inning — at pro events often 40–45 seconds per shot.",
      },
      {
        text: "Change of innings",
        hint: "No point or foul — turn passes; break continues after scoring stroke.",
      },
      {
        text: "Referee and scoreboard",
        hint: "Score on display; disputed contacts decided by referee or video replay per regulations.",
      },
    ],
  },
  commonFouls: [
    "Scoring conditions not met (no contact with two balls or insufficient rebounds in three-cushion).",
    "Cue ball contacts no ball.",
    "Cue ball or object ball crosses baulk line without a scored point.",
    "Ball off table — penalty and ball-in-hand per regulations.",
    "Double hit, push shot, touching a ball by hand or foreign object.",
    "Shot not from cloth — cue ball not touching cloth at moment of strike.",
    "Play outside zone in cadre — ball crossed cadre line without permitted contact.",
    "Moving a ball by hand during setup after foul — only per ball-in-hand rules.",
  ],
  games: [
    {
      slug: "trehband",
      title: "Three-cushion",
      subtitle: "Carom · Olympic program discipline",
      badge: "Three cushions",
      tagline:
        "Cue ball contacts two object balls and rebounds from cushions at least three times. The highest class of carom geometry.",
      seo: {
        title: "Three-cushion — rules",
        description:
          "Three-cushion rules: three cushion rebounds and contact with two balls in one stroke, setup, break runs, fouls and match format.",
        keywords: [
          "three-cushion",
          "3 cushion",
          "three cushions billiards",
          "three-cushion rules",
          "carom billiards",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Reach the set number of points before the opponent. One point — one scoring stroke: cue ball contacts the second and third ball (in any order), and rebounds from cushions at least three times before or between contacts.",
            "Inning — to 15, 25, 40, or 50 points; match — to N wins. Format specified by organizer on billiard.guru.",
          ],
          bullets: [
            "Continental and world championships — three-cushion as main carom discipline.",
            "Average professional run — several points in a row; records — dozens of consecutive points.",
          ],
        },
        {
          id: "setup",
          title: "Setup and lot",
          bullets: [
            "Red — on center spot (or per starting position regulations).",
            "Cue ball — in D-zone; first stroke from hand in D or from baulk line.",
            "Players assign plain white and spotted white; first stroke — by lot.",
            "After scoring stroke cue ball stays where it stops — break continues.",
          ],
        },
        {
          id: "scoring",
          title: "Scoring a point",
          paragraphs: [
            "One point counts if in one stroke all conditions are met: cue ball contacts two other balls; at least three cushion rebounds total (counted by referee or players by agreement).",
            "Cushion rebound counts if cue ball or object ball touches the cushion rubber. Ball-to-ball contact does not replace cushion rebound.",
          ],
          bullets: [
            "Order of ball contacts may vary: cue ball → red → second white or other sequence.",
            "Three cushions may occur before first ball contact, between contacts, or after — three before stroke ends.",
            "Several points in a row — break; opponent gets no stroke while break continues.",
          ],
        },
        {
          id: "play",
          title: "Flow of play",
          bullets: [
            "After non-scoring stroke (no point, no foul) — change of innings; balls stay in place.",
            "Defensive play — leave opponent a difficult position without clear foul.",
            "Positional play: plan not only current point but cue-ball position for next.",
            "Power strokes less common than pool — fine cut and long rebounds dominate.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Cue ball contacts no ball — foul; change of innings, sometimes penalty point to opponent.",
            "Fewer than three cushion rebounds with contact of two balls — no point; foul if no ball contact.",
            "Ball off table — penalty (often 1–2 points to opponent) and ball-in-hand per regulations.",
            "Double hit, push shot, touching ball by hand — foul and change of innings.",
            "Cue ball in opponent's D without score — restriction on next stroke per regulations.",
          ],
        },
        {
          id: "match",
          title: "Match and tournament",
          bullets: [
            "Shot time limit — typically 40–45 seconds at world events.",
            "Tie in inning — \"golden stroke\" or extra inning.",
            "On billiard.guru format (points to win, time limit) — in event card.",
          ],
        },
        {
          id: "vs-other",
          title: "Difference from straight rail",
          bullets: [
            "Three-cushion requires three cushion rebounds; straight rail — contact with two balls is enough.",
            "Three-cushion is harder and more spectacular; straight rail — foundation for learning rebounds.",
            "Same table, same three balls — scoring rules differ.",
          ],
        },
      ],
    },
    {
      slug: "pryamoy",
      title: "Straight rail",
      subtitle: "Carom · two balls per stroke",
      badge: "Basic",
      tagline:
        "One point when cue ball contacts both other balls in one stroke. Cushion rebounds not required — easier entry into carom.",
      seo: {
        title: "Straight rail — rules",
        description:
          "Straight rail rules: one point for contacting two balls, no mandatory cushions. Basic discipline for learning carom billiards.",
        keywords: [
          "straight rail",
          "straight rail billiards",
          "carom billiards rules",
          "two ball carom",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Reach the set number of points before the opponent. One point per stroke if cue ball contacts both other balls (red and second white).",
            "Classic format for training, club tournaments, and warm-up before three-cushion.",
          ],
          bullets: [
            "Inning — to 10, 15, or 25 points by agreement.",
            "Change of innings and foul rules close to three-cushion, but without three-cushion requirement.",
          ],
        },
        {
          id: "setup",
          title: "Setup",
          bullets: [
            "Three balls on table: red and two whites (players' cue balls).",
            "Start — red on center spot, cue ball in D; first stroke — by lot.",
            "After scoring stroke play continues from where cue ball stops.",
          ],
        },
        {
          id: "scoring",
          title: "Scoring a point",
          paragraphs: [
            "Point counts when cue ball in one stroke contacts both other balls. Order of contacts does not matter.",
            "Cushion rebounds not required — may score \"head-on\" or off one cushion.",
          ],
          bullets: [
            "Carom stroke: cue ball → red → second white — one point.",
            "Break continues while player scores; miss — change of innings.",
          ],
        },
        {
          id: "play",
          title: "Flow of play",
          bullets: [
            "Focus on simple contacts and speed control — fewer long \"molecular\" trajectories than three-cushion.",
            "Good for practicing cut, rebound angle, and cue-ball position.",
            "In clubs often played \"until miss\" or with stroke limit per inning.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Cue ball does not contact both balls — no point; complete miss — foul and change of innings.",
            "Ball off table — penalty point and ball-in-hand per regulations.",
            "Double hit, push shot, touching by hand — foul.",
            "Cue ball not touching cloth on stroke — foul.",
          ],
        },
        {
          id: "learning",
          title: "For training",
          paragraphs: [
            "Straight rail is the traditional first step before three-cushion: same three balls and table, but simpler scoring condition.",
          ],
          bullets: [
            "After mastering two-ball contact, move to counting rebounds in three-cushion.",
            "In some halls the table is also used for pyramid with cushions — check table type in club catalog.",
          ],
        },
      ],
    },
    {
      slug: "kadre",
      title: "Cadre",
      subtitle: "Carom · zone play",
      badge: "Precision",
      tagline:
        "Points only for contacts inside a marked zone on the table. Strokes from the \"box\" — maximum precision.",
      seo: {
        title: "Cadre — carom billiards rules",
        description:
          "Cadre rules: play in a limited zone on the table, scoring contacts inside the cadre, 47/2 and 52/2 variants.",
        keywords: [
          "cadre billiards",
          "cadre carom",
          "cadre billiards rules",
          "zone play billiards",
          "carom billiards rules",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and format",
          paragraphs: [
            "Score points for legal ball contacts inside a rectangular zone (cadre) marked on cloth or implied by spot marks.",
            "Discipline demands precision: balls must stay in zone or enter per specific variant rules.",
          ],
          bullets: [
            "Variants: cadre 47/2, 52/2 and others — zone size and scoring set by regulations.",
            "Popular in European federations as complement to three-cushion.",
          ],
        },
        {
          id: "zone",
          title: "Cadre zone",
          bullets: [
            "Rectangle (cadre) marked on table — lines from spot marks on cushions.",
            "Scoring contacts — when both balls (or cue ball and object ball) are in zone at moment of score.",
            "Ball leaving cadre line without permitted contact — no point or penalty.",
            "Starting \"box\" — stroke only from D or baulk line if cue ball is in zone.",
          ],
        },
        {
          id: "setup",
          title: "Setup",
          bullets: [
            "Red and cue ball placed inside cadre or at starting points per regulations.",
            "Lot determines first player and white ball assignment.",
            "After foul — opponent's ball-in-hand per discipline rules (often from D).",
          ],
        },
        {
          id: "scoring",
          title: "Scoring a point",
          paragraphs: [
            "Point — for stroke meeting cadre conditions: contact with two balls (as in straight rail) or with rebounds — per variant regulations.",
            "Main difference — geographic limit: play in a narrow zone, not the full table.",
          ],
          bullets: [
            "Tactics: keep balls in cadre and deny opponent easy ball-in-hand.",
            "Long rebounds are risky — may send ball over the line.",
          ],
        },
        {
          id: "play",
          title: "Flow of play",
          bullets: [
            "Short strokes and precise cut matter more than power.",
            "Break possible while player does not miss or cross cadre boundary.",
            "Change of innings — as in other carom disciplines.",
          ],
        },
        {
          id: "fouls",
          title: "Fouls",
          bullets: [
            "Ball stayed or left cadre without score — no point; penalty per regulations.",
            "Stroke outside permitted ball-in-hand zone — foul.",
            "General carom fouls: double hit, push shot, touching by hand.",
            "Dispute on ball on line decided by referee (ball on line often counts \"in zone\").",
          ],
        },
        {
          id: "variants",
          title: "Cadre variants",
          bullets: [
            "47/2 and 52/2 — cadre size in centimeters; confirm with organizer.",
            "Club play may simplify zone for training.",
            "On billiard.guru rare format — check regulations in tournament card.",
          ],
        },
      ],
    },
  ],
};

export const CAROM_TABLE_EN = withBilliardHistory(
  CAROM_TABLE_BASE,
  CAROM_TABLE_HISTORY_EN,
  CAROM_GAME_HISTORIES_EN,
);
