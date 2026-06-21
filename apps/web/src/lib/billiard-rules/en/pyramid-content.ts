import type { BilliardTableType } from "@/lib/billiard-rules/content";
import { withBilliardHistory } from "@/lib/billiard-rules/history/attach-history";
import {
  PYRAMID_GAME_HISTORIES_EN,
  PYRAMID_TABLE_HISTORY_EN,
} from "@/lib/billiard-rules/en/history/pyramid-history";

/** Russian pyramid — extended content for /en/rules/pyramid. Parameters per ICP / RBF. */
const PYRAMID_TABLE_BASE_EN: BilliardTableType = {
  id: "PYRAMID",
  slug: "pyramid",
  title: "Pyramid",
  lead: "Pocket table with tight pockets: 16 large balls, precise stroke, and long runs.",
  teaser:
    "Free, dynamic, combined, kolkhoz, and fishki — disciplines on the pyramid table.",
  pockets: true,
  pocketsLabel: "6 tight pockets",
  seo: {
    title: "Pyramid — rules, disciplines and table specs",
    description:
      "Russian pyramid reference: free, dynamic, combined, classic 71, kolkhoz, fishki. 68 mm balls, tight 72–81 mm pockets, 12 ft table. For players and referees.",
    keywords: [
      "pyramid rules",
      "russian billiards",
      "free pyramid",
      "dynamic pyramid",
      "moscow pyramid",
      "kolkhoz billiards",
      "fishki billiards",
      "12 ft pyramid table",
      "68 mm balls",
    ],
  },
  specs: [
    { label: "Pockets", value: "6 (tight)" },
    { label: "Balls", value: "16 (15 + cue ball)" },
    { label: "Table size", value: "12 ft (approx. 3.6 x 1.8 m)" },
    { label: "Ball diameter", value: "68–68.5 mm" },
  ],
  overview: [
    "Pyramid is pocket billiards: balls are pocketed in six tight pockets. A pocket is only slightly wider than the ball — misses and cushion kicks are common, so a clean stroke is valued.",
    "On billiard.guru tournaments are most often free or dynamic pyramid. Clubs also favor collective formats — kolkhoz (3+ players) and fishki.",
  ],
  equipment: {
    title: "Table, ball, and pocket specifications",
    intro:
      "Tournament standard — 12 ft per ICP (International Pyramid Committee) and Russian billiard sport regulations. Clubs also use 10 ft and 9 ft tables with proportionally smaller pockets. Whether cue ball in pocket counts and cue-ball choice depend on the discipline — do not confuse free, classic 71, and Moscow pyramid.",
    groups: [
      {
        title: "Playing surface and table",
        table: {
          headers: ["Parameter", "12 ft (tournament)", "10 / 9 ft (club)"],
          rows: [
            ["Playing surface", "3550 x 1775 mm", "2950 x 1470 / 2540 x 1270 mm"],
            ["Overall table size", "approx. 3840 x 2060 mm", "approx. 3240 x 1750 / 2830 x 1560 mm"],
            ["Height from floor", "approx. 850–900 mm", "approx. 850 mm"],
            ["Markings", "Kitchen, foot spot, center line", "Same elements"],
          ],
        },
      },
      {
        title: "Balls",
        table: {
          headers: ["Parameter", "Tournament", "Note"],
          rows: [
            ["Set", "16 balls", "15 object balls + 1 cue ball"],
            ["Object balls", "White, numbered 1–15", "Unnumbered allowed in free/dynamic per regulations"],
            ["Cue ball", "Colored (yellow), unnumbered", "Pocket scoring — by discipline (see below)"],
            ["Diameter", "68.0–68.5 mm", "Pair tolerance +/-0.05 mm"],
            ["Weight per ball", "approx. 280–285 g", "Larger and heavier than pool (57 mm)"],
            ["Material", "Phenolic resin", "Uniform set required"],
          ],
        },
      },
      {
        title: "Pockets",
        table: {
          headers: ["Pocket type", "Opening width", "Feature"],
          rows: [
            ["Corner (4)", "72–73 mm", "Between cushion facings — tightest"],
            ["Side on long rail (2)", "80–81 mm", "Slightly wider than corner, still snug"],
            ["Placement", "4 corners + 2 centered on long rails", "Unlike pool: side pockets on the long side"],
            ["Gap to ball", "approx. 2–4 mm", "Ball passes with a precise hit; combinations harder than pool"],
          ],
        },
      },
    ],
    note: "Before a tournament the referee checks equipment against regulations. Cue-ball and pocket scoring rules depend on the discipline — see the game page. Casual play may allow minor equipment deviations.",
  },
  checklist: {
    title: "Pre-game or pre-tournament checklist",
    intro: "Go through these at the table — fewer disputes about regulations and equipment.",
    items: [
      {
        text: "Discipline confirmed",
        hint: "Free, dynamic (Nevskaya), combined (Moscow), fishki, or other — per tournament card or agreement.",
      },
      {
        text: "Frame format and handicap",
        hint: "To N wins, to 8 balls, to 71/76 points; rating handicap 0.5 steps or whole numbers only — in tournament settings on billiard.guru.",
      },
      {
        text: "Table and markings",
        hint: "Kitchen, foot spot, and center line visible; cloth without major damage.",
      },
      {
        text: "Pyramid balls, set of 16",
        hint: "Diameter approx. 68 mm, colored cue ball separate from whites; no chips or large weight differences.",
      },
      {
        text: "Six tight pockets",
        hint: "Corner approx. 72–73 mm, side approx. 80–81 mm on 12 ft; ball does not drop without a precise hit.",
      },
      {
        text: "Cue-ball rules",
        hint: "Free/dynamic: carom pocketing (cue ball in pocket after object-ball contact); after break any ball may be cue ball. Classic 71 and Moscow: colored cue ball only; cue ball in pocket — foul (in Moscow — only if called).",
      },
      {
        text: "Opening shot (break)",
        hint: "From the hand in the kitchen; must be legal under general pyramid rules (contact, cushion or pocket).",
      },
      {
        text: "Jumped ball",
        hint: "Ball off the table — per regulations: spot on foot spot, penalty, change of inning.",
      },
      {
        text: "For kolkhoz — rotation and who you score for",
        hint: "3+ players in rotation; classic — score for previous player, tally — difference with next in order. Color kolkhoz — call shots and points by color, club rules.",
      },
      {
        text: "For fishki — separate regulations",
        hint: "Skittles in center, points for knocked pins; pockets do not count. Not to be confused with Italian 5-pin carom.",
      },
    ],
  },
  commonFouls: [
    "Cue ball in pocket without allowed scoring: in classic 71 and Moscow pyramid — foul; in free/dynamic — foul if cue ball did not contact an object ball (carom pocketing — see free pyramid).",
    "Cue ball or object ball jumped off the table.",
    "Cue ball did not contact any object ball.",
    "Object ball neither reached a cushion nor was pocketed (no legal shot).",
    "Double hit, push shot, touching a ball with hand or foreign object.",
    "Jump shot (both balls off cloth at impact if regulations forbid it).",
    "Hitting a ball not yet in play, or wrong ball in combined pyramid without call.",
    "Break violation — opponent gets ball in hand from kitchen or repeat break per regulations.",
  ],
  games: [
    {
      slug: "svobodnaya",
      title: "Free (Americana) pyramid",
      subtitle: "Free pyramid · Americana",
      badge: "Tournament",
      tagline:
        "Most popular discipline: after the break any ball on the table may become the cue ball. Win by balls or match to N frames.",
      seo: {
        title: "Free (Americana) pyramid — rules",
        description:
          "Free pyramid rules: break from kitchen, any ball as cue ball, carom pocketing, run scoring and common fouls. Main tournament discipline of Russian billiards.",
        keywords: [
          "free pyramid",
          "americana billiards",
          "russian pyramid rules",
          "carom pocketing pyramid",
          "free pyramid break",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and frame format",
          paragraphs: [
            "Pocket the set number of balls before your opponent or win a series of frames (to 1, 2, 3 wins). Format is set by the tournament organizer or club — on billiard.guru it appears on the event card.",
            "Unlike combined (Moscow) pyramid, no pocket call is required: any legal scoring shot counts. Unlike classic pyramid — after balls are in play you may use any ball as cue ball.",
          ],
          bullets: [
            "Club: to 8 balls, first run, run-out, or time limit per frame.",
            "Tournament: match to N wins; rating handicap — see event regulations.",
            "Tie on time or shot limit resolved per tournament rules (replay, golden ball).",
          ],
        },
        {
          id: "setup",
          title: "Rack and lag",
          bullets: [
            "15 white balls (numbered or not — per regulations) — pyramid at foot spot, base parallel to short rail.",
            "Cue ball (colored, unnumbered) — in kitchen; first shot from the hand in kitchen.",
            "First shot — lag, simultaneous hit to foot rail, or alternation by frame.",
            "Referee checks pyramid tightness and cue ball fully in kitchen.",
          ],
        },
        {
          id: "break",
          title: "Break shot",
          paragraphs: [
            "Opening shot is legal if after cue-ball contact with an object ball there is no foul and at least one of: at least one ball pocketed; or at least two balls touch cushions; or cue ball crosses center line and returns to kitchen; or any ball touches a cushion.",
            "Illegal break: opponent gets ball in hand from kitchen or right to re-break — per regulations. Two consecutive illegal breaks by one player often award opponent a penalty ball.",
          ],
        },
        {
          id: "play",
          title: "Play and scoring shots",
          bullets: [
            "After break and after each ball in hand from kitchen — any ball on the table may become cue ball (except first shot of run immediately after ball in hand: then only from kitchen with designated cue ball).",
            "Scoring: object ball in pocket; or cue ball in pocket after contact with object ball (carom pocketing).",
            "Run continues while player pockets or makes legal shot without foul.",
            "Cue ball in pocket without object-ball contact — penalty: opponent from hand in kitchen, sometimes spot ball on foot spot.",
            "Legal shot: object ball pocketed or touches cushion; if not pocketed — cue ball after shot must also touch cushion or pocket.",
          ],
        },
        {
          id: "balls-out",
          title: "Off-table and pocketed balls",
          bullets: [
            "Object ball or cue ball off table — foul; ball spotted on foot spot (or center — per regulations), opponent from hand in kitchen.",
            "If several balls leave table — all spotted; spotting order may affect tactics.",
            "Cue ball remains in pocket after scoring shot — next shot from hand in kitchen; new cue ball chosen on table.",
            "Touching a ball on spotting line before shot — foul.",
          ],
        },
        {
          id: "fouls",
          title: "Violations and penalties",
          bullets: [
            "Cue ball misses all object balls (no contact with any ball).",
            "Cue ball in pocket without prior object-ball contact — penalty (carom pocketing only after contact).",
            "Illegal shot — object ball not pocketed and did not reach cushion, cue ball also did not reach cushion/pocket.",
            "Double hit, push, shot not from cloth, touching ball with hand or cue outside stroke zone.",
            "Jump shot — both balls off cloth at impact (if forbidden).",
            "After foul opponent shoots from hand in kitchen; repeated foul in same run may award penalty ball.",
          ],
        },
        {
          id: "tournament",
          title: "At billiard.guru tournaments",
          paragraphs: [
            "Organizer sets discipline Free pyramid, frame format, and handicap. Before the match confirm time limit, balls to win, and replay rules.",
          ],
          bullets: [
            "Referee records score and disputes; without referee — senior floor staff or by agreement.",
            "Equal match score may use golden frame with special break — see regulations.",
          ],
        },
      ],
    },
    {
      slug: "dinamicheskaya",
      title: "Dynamic (Nevskaya) pyramid",
      subtitle: "Dynamic pyramid · Nevskaya",
      badge: "Fast tempo",
      tagline:
        "Before the first shot the pyramid is broken up — open play from stroke one. Scoring, cue-ball, and foul rules as in free (Americana) pyramid.",
      seo: {
        title: "Dynamic (Nevskaya) pyramid — rules",
        description:
          "Dynamic pyramid rules: broken rack before play, fast tempo, same scoring as free pyramid. Popular for club tournaments and televised matches.",
        keywords: [
          "dynamic pyramid",
          "nevskaya pyramid",
          "russian billiards",
          "dynamic pyramid rules",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Essence of the discipline",
          paragraphs: [
            "Dynamic pyramid (Nevskaya) is a free-pyramid variant with the same scoring logic but different table setup: 15 balls are not left in a tight pyramid after break but spread on the table beforehand.",
            "This removes long positional play after a tight break and speeds the frame — popular in club leagues, televised matches, and time-limited tournaments.",
          ],
          bullets: [
            "Win as in free pyramid: by balls, run, or match to N frames.",
            "No pocket call required; any ball may be cue ball after balls are in play.",
          ],
        },
        {
          id: "setup",
          title: "Table preparation",
          bullets: [
            "15 object balls racked at foot spot, then broken up per regulations: by hand (balls pushed apart) or controlled stroke — so no solid cluster remains in center.",
            "Goal — even spread over half the table without cushion contact (or minimal contact — confirm with referee).",
            "Cue ball — in kitchen; first shot by lag or line shot.",
            "Some halls limit spread zone (e.g. not closer than kitchen line) — fix before frame.",
          ],
        },
        {
          id: "spread",
          title: "Spreading the pyramid",
          paragraphs: [
            "Spread is done by player who won first shot or separately by lot — per tournament regulations. Illegal spread (balls frozen, in kitchen, openness not achieved) — repeat or penalty.",
          ],
          bullets: [
            "Typical requirement: after spread no ball touches another more than point contact; gap between balls.",
            "If ball goes in pocket or off table during spread — spotted, penalty or change of spread right possible.",
            "After spread first player breaks from kitchen — legal opening shot criteria as in free pyramid.",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "After break — full free pyramid rules: pocket scoring, carom pocketing, any ball as cue ball.",
            "Legal shot, run, ball in hand after foul — as in free pyramid.",
            "Higher tempo: balls already spread — attack in first 3–5 shots often decides frame.",
            "Tactics: fast scoring beats long defense; defensive play rarer than in classic pyramid.",
          ],
        },
        {
          id: "fouls",
          title: "Violations",
          paragraphs: [
            "Foul list matches free pyramid: miss, illegal shot, cue ball in pocket without object-ball contact, ball off table, double hit, push, etc.",
          ],
          bullets: [
            "Penalty — opponent ball in hand from kitchen; systematic violations — penalty ball.",
            "Illegal break after spread handled same as in free pyramid.",
          ],
        },
        {
          id: "vs-free",
          title: "Difference from free pyramid",
          bullets: [
            "Only preparation: free pyramid plays from pyramid after break; Nevskaya — pre-spread balls.",
            "On billiard.guru tournament description may say Dynamic or Nevskaya — same scoring rule line.",
            "Handicap and match format set by organizer same as free pyramid.",
          ],
        },
      ],
    },
    {
      slug: "kombinirovannaya",
      title: "Combined (Moscow) pyramid",
      subtitle: "Moscow pyramid · call shots",
      badge: "Call shots",
      tagline:
        "Before each shot — call ball and pocket. Points by ball numbers, classic target 71 or 76.",
      seo: {
        title: "Combined (Moscow) pyramid — rules",
        description:
          "Moscow pyramid rules: call ball and pocket, points by ball numbers, 71/76 target. Penalties and tournament regulations per MKP/RBF.",
        keywords: [
          "moscow pyramid",
          "combined pyramid",
          "call shot pyramid",
          "71 points pyramid",
          "russian billiards",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and scoring",
          paragraphs: [
            "Reach 71, 76, or 130 points (by discipline) before opponent. Ball number N — N points; ball No. 1 — 11; last ball on table adds +10 to its number.",
            "Sum of all 15 ball numbers = 120; with adjustments for ball 1 and last ball yields target 71 (or 76 in extended frame).",
          ],
          bullets: [
            "Frame may last hours — defense, penalty points, and call tactics matter.",
            "Official RBF and ICP discipline; at competitions referee records calls.",
          ],
        },
        {
          id: "call",
          title: "Call and scoring",
          bullets: [
            "Before shot player or referee records: which object ball and which pocket (or any pocket if regulations allow).",
            "Call cannot change after shot. Wrong ball or pocket — ball spotted on foot spot, turn passes or stays with shooter — per regulation table.",
            "Cue ball in pocket after object-ball contact counts only if part of call.",
            "Uncalled ball pocketed — penalty points to opponent and spotting.",
          ],
        },
        {
          id: "setup",
          title: "Rack and cue ball",
          bullets: [
            "15 white balls numbered 1–15 — pyramid at foot spot.",
            "Cue ball — colored (yellow) only; in pocket — only if called; otherwise foul.",
            "Free choice of any ball as cue ball not allowed — colored cue ball only.",
          ],
        },
        {
          id: "break",
          title: "Break and ball in hand",
          bullets: [
            "Break — from hand in kitchen; legal opening shot criteria as in general pyramid rules.",
            "After foul opponent shoots from hand in kitchen; penalty points per table (often -1, -2, or ball value).",
            "Systematic violations may lead to disqualification per competition regulations.",
          ],
        },
        {
          id: "scoring-table",
          title: "Point table (typical)",
          bullets: [
            "Ball No. 1 — 11 points; balls No. 2–14 — by number (2–14 points).",
            "Ball No. 15 — 15 points; if last on table — +10 (25 total for final shot).",
            "Penalty points to opponent: foul, uncalled ball, cue ball in pocket — per official ICP table.",
          ],
        },
        {
          id: "tournament",
          title: "At competitions",
          paragraphs: [
            "Moscow pyramid is main discipline for classic RBF tournaments. Referee keeps call protocol; player must wait for call confirmation before shot.",
          ],
          bullets: [
            "Timeouts and medical breaks — per championship regulations.",
            "Equal score — replay or golden frame to first lead.",
            "On billiard.guru format and point limit on tournament card.",
          ],
        },
      ],
    },
    {
      slug: "klassicheskaya-71",
      title: "Classic (71 points) pyramid",
      subtitle: "Classic pyramid · small pyramid",
      badge: "Points",
      tagline:
        "Count by ball numbers to 71 points. Colored cue ball, no free cue-ball choice — unlike free pyramid.",
      seo: {
        title: "Classic (71 points) pyramid — rules",
        description:
          "Classic pyramid rules: score by ball numbers to 71 points, colored cue ball only, no free cue-ball choice. Official discipline of Russian billiards.",
        keywords: [
          "classic pyramid",
          "71 points pyramid",
          "small pyramid",
          "russian billiards rules",
        ],
      },
      sections: [
        {
          id: "goal",
          title: "Objective and scoring",
          paragraphs: [
            "First to 71 points (or more per finish rules). Ball No. k — k points; ball 1 — 11; last ball remaining on table — +10 to its number.",
            "Small pyramid — historical name; not to be confused with free pyramid where balls are counted, not points by number.",
          ],
          bullets: [
            "Frame ends at target or when opponent cannot catch up on points.",
            "Exact finish order (must pocket last ball) — per RBF/ICP regulations.",
          ],
        },
        {
          id: "setup",
          title: "Rack",
          bullets: [
            "15 numbered white balls — pyramid; cue ball — colored, in kitchen.",
            "No pocket call required (unlike Moscow). Cue ball — colored only; in pocket — foul, no carom pocketing.",
            "Break and first shot — under general pyramid rules.",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "Only object ball in pocket counts; cue ball in pocket — always foul.",
            "Cannot choose any ball as cue ball: play with colored cue ball only.",
            "Run planning: pocket high numbers, do not leave hanging points for opponent.",
            "Defense and safety exchanges — part of point-scoring tactics.",
          ],
        },
        {
          id: "vs-free",
          title: "Difference from free and Moscow pyramid",
          bullets: [
            "From free: fixed cue ball, points by numbers, not ball count.",
            "From Moscow: no mandatory call of ball and pocket each shot.",
            "Tournaments rarer than free, but discipline kept in classic competition programs.",
          ],
        },
        {
          id: "fouls",
          title: "Violations",
          bullets: [
            "General pyramid fouls: miss, illegal shot, cue ball in pocket (no carom pocketing), ball off table.",
            "Penalty — points to opponent and/or ball in hand from kitchen.",
            "Playing with wrong ball as cue ball — foul.",
          ],
        },
      ],
    },
    {
      slug: "kolhoz",
      title: "Kolkhoz (troynik, kolbasa)",
      subtitle: "Collective play · 3+ players",
      badge: "3+ players",
      tagline:
        "Circular play for three or more: pocket balls for the previous player, score — difference with whoever follows you.",
      seo: {
        title: "Kolkhoz (troynik) pyramid — rules",
        description:
          "Kolkhoz pyramid rules: 3+ players in rotation, score for previous player, tally by difference with next. Classic and color variants, calls and penalties.",
        keywords: [
          "kolkhoz billiards",
          "kolkhoz pyramid",
          "troynik billiards",
          "collective pyramid game",
        ],
      },
      sections: [
        {
          id: "idea",
          title: "Essence",
          paragraphs: [
            "Kolkhoz (also kolbasa, troynik) is a club collective discipline on the pyramid table. No single nationwide regulation: rules are fixed at the table before play.",
            "Main idea: you do not play for yourself but for the player before you in order, and try not to leave easy balls for whoever follows you.",
          ],
        },
        {
          id: "classic",
          title: "Classic kolkhoz (white balls)",
          bullets: [
            "3 or more participants; shot order — by lot, in rotation.",
            "15 white pyramid + colored cue ball; break as in free pyramid.",
            "Ball you pocket counts for player before you in queue (or to shelf / score pocket — by agreement).",
            "After run or frame: your pocketed minus next player pocketed. Example: you 3, they 2 — you +1.",
            "The fewer the next player pockets, the better your result.",
            "Tactics: leave hard position, do not feed next in rotation.",
          ],
        },
        {
          id: "color",
          title: "Color kolkhoz (popular in clubs)",
          paragraphs: [
            "Colored balls with point values added to whites: white = 1, yellow = 2, red = 3 and up — set depends on hall.",
          ],
          bullets: [
            "Color ball often pocketed with call (as in Moscow): name ball and pocket.",
            "Svoyak (ball same color as just played) gives fewer points and may stay on table or be removed per club rules.",
            "Durak — uncalled or accidentally pocketed ball; penalty points per hall table.",
            "High-value color ball sometimes not removed immediately but spotted on foot spot if lower-value balls remain.",
          ],
        },
        {
          id: "scoring",
          title: "Scoring",
          bullets: [
            "Points recorded after each pocket or end of rotation — as agreed.",
            "End of frame compare all participants; negative values often zeroed or passed as penalty next round.",
            "Foul penalty: white kolkhoz often -1; color — minus value of called ball.",
          ],
        },
        {
          id: "club",
          title: "Before play",
          bullets: [
            "Agree: player count, color set, call shots, durak handling, frame limit.",
            "Write player order — queue confusion is a common dispute cause.",
            "billiard.guru does not run kolkhoz tournaments — friendly club format.",
          ],
        },
        {
          id: "fouls",
          title: "Violations",
          bullets: [
            "Base pyramid fouls (miss, cue ball in pocket without scoring, ball off table) — by agreement, often as free pyramid; penalty often -1 in white kolkhoz.",
            "In color — minus value of called ball or durak to opponent.",
            "After foul next player in rotation shoots.",
          ],
        },
      ],
    },
    {
      slug: "fishki",
      title: "Fishki (skittles on pyramid table)",
      subtitle: "Club game · not Italian 5-pin carom",
      badge: "Club",
      tagline:
        "5 wooden skittles in center — points for knocked pins. Pocket table, but pockets do not score.",
      seo: {
        title: "Fishki (skittles) on pyramid table — rules",
        description:
          "Fishki on Russian pyramid: 5 wooden skittles, points for knocked pins, pockets do not count. Club format — not Italian 5-pin carom.",
        keywords: [
          "fishki billiards",
          "pyramid skittles",
          "kolki billiards",
          "russian billiards club",
        ],
      },
      sections: [
        {
          id: "idea",
          title: "Essence",
          paragraphs: [
            "Amateur game on the same 12 ft pyramid table with tight pockets. Five wooden skittles (pins 8–10 cm) in a cross at center. Use 2–3 balls or full set — by agreement.",
            "Points — only for skittles knocked by legal ball contact. Pocketed ball alone does not score; pockets only remove balls from play.",
          ],
          bullets: [
            "Play head-to-head or in rotation; win to 30, 50, or 60 points.",
            "Popular in clubs as warm-up or parallel format when tables are busy with tournaments.",
          ],
        },
        {
          id: "setup",
          title: "Skittle and ball setup",
          bullets: [
            "Cross on center lines; center (red / king) higher than others.",
            "Distance between skittles — slightly more than ball diameter so pins do not freeze.",
            "Cue ball and object balls — by agreement: often 2–3 balls, sometimes full pyramid set.",
            "After knocked skittles reset before next shot (or only king — per hall rules).",
          ],
        },
        {
          id: "play",
          title: "Play",
          bullets: [
            "Shot from hand in kitchen or from cue-ball position after previous shot — by agreement.",
            "Only skittles knocked via cue-ball contact with another ball (or ball chain) count.",
            "Direct cue-ball hit on skittle often foul — points to opponent.",
            "Ball in pocket — out of play or returned to table — per club rules.",
            "Run: while knocking skittles without foul, you keep the table.",
          ],
        },
        {
          id: "scoring",
          title: "Points (typical in clubs)",
          bullets: [
            "White skittle — 2 points; red with whites combination — 4; red only (king) — 10.",
            "Value variants and full-house bonus (all 5 in one shot) vary by hall — fix before frame.",
            "Play to 30, 50, or 60 points; tie — extra round or replay to win.",
          ],
        },
        {
          id: "fouls",
          title: "Violations",
          bullets: [
            "Direct hit on skittle with cue ball without contacting another ball.",
            "Double hit, ball off table, cue contact not on cue ball.",
            "Penalty — points to opponent (often 2 or 4) and change of inning.",
          ],
        },
        {
          id: "not-carom",
          title: "Not carom billiards",
          paragraphs: [
            "Italian 5-pin — separate discipline on 10 ft carom table without pockets: different sizes, stroke rules, and scoring.",
            "Russian fishki on pyramid table — standalone club format, not in RBF program.",
          ],
        },
      ],
    },
  ],
};

export const PYRAMID_TABLE_EN = withBilliardHistory(
  PYRAMID_TABLE_BASE_EN,
  PYRAMID_TABLE_HISTORY_EN,
  PYRAMID_GAME_HISTORIES_EN,
);
