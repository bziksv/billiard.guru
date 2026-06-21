import type { BilliardHistory } from "@/lib/billiard-rules/content";

export const PYRAMID_TABLE_HISTORY_EN: BilliardHistory = {
  title: "History and geography of pyramid",
  intro:
    "Pyramid billiards is the dominant format across the post-Soviet world. Below: who brought billiards to Russia, how the English table evolved into Russian pyramid, a chronology of disciplines, and geography from St. Petersburg to the World Cup.",
  sections: [
    {
      id: "who-brought",
      title: "Who brought billiards to Russia",
      paragraphs: [
        "Pocket billiards arrived in Russia with the European fashion of the 18th century. Under Peter the Great, the first billiard halls appeared in St. Petersburg — tables and craftsmen from Holland, England, and France. This was not a Russian invention from scratch, but an adaptation of English and continental pocket billiards to local rules and dimensions.",
        "By the 19th century, clubs in the capitals used large balls and tight pockets — a prototype of future pyramid: 15 white balls in a triangle and a colored cue ball. Aristocratic and merchant halls in Moscow and St. Petersburg, later provincial clubs.",
        "There is no single inventor of pyramid. The name Russian billiards / pyramid stuck to the domestic standard: ball approx. 68 mm, pocket only 2–4 mm wider than the ball, side pockets on the long rail (unlike American pool).",
      ],
      bullets: [
        "Peter the Great and European masters — the start of billiards in Russia (early 18th century).",
        "19th century — club culture, pyramid rack 15+1.",
        "USSR — official 12 ft standard and disciplines with and without call shots.",
      ],
    },
    {
      id: "chronology",
      title: "Chronology of pyramid billiards",
      table: {
        headers: ["Period", "Event"],
        rows: [
          ["Early 18th century", "First billiard halls in St. Petersburg; European tables"],
          ["19th century", "Clubs in Moscow and St. Petersburg; large balls, tight pockets"],
          ["1917–1940s", "Billiards outside mainstream sport, but alive in workers and student clubs"],
          ["1950s–1980s", "Official USSR sport; 12 ft standard; classic and Moscow pyramid"],
          ["1980s–1990s", "Free and Nevskaya (dynamic) pyramid in clubs and on TV"],
          ["1990s–present", "ICP, RBF, World Cup; free pyramid — mass tournament format"],
          ["2000s–present", "Ratings, billiard.guru, streams; kolkhoz and fishki — club classics"],
        ],
      },
    },
    {
      id: "origins-detail",
      title: "How Russian pyramid differs from pool and snooker",
      paragraphs: [
        "The difference from American pool was set from the start: ball approx. 68 mm (vs 57 mm), pocket only a few millimeters wider than the ball — combinations are harder, precision and long runs are valued.",
        "Before the revolution, rules were not unified: clubs played for pockets, for points, with call shots and without. After 1917 billiards was long outside mainstream sport, but the pyramid table remained the standard in workers and student clubs.",
      ],
    },
    {
      id: "soviet-era",
      title: "USSR: table standard and birth of disciplines",
      paragraphs: [
        "In the 1950s–1980s billiards became an official USSR sport. Tournament table size 12 ft (approx. 3.6 x 1.8 m), six pockets, a set of 16 balls were fixed. Sports societies (Dynamo, Spartak, Trud) and DSO clubs became the base for schools.",
        "Classic (small) pyramid to 71 points and Moscow pyramid with call of ball and pocket — the core of official competition. Free pyramid (Americana in club slang) existed in parallel: any ball after the break could become the cue ball; carom pocketing of the cue ball — a legal part of the game.",
        "Kolkhoz and fishki were never in sports-committee programs, but defined mass club culture: collective play for three or more and skittles on the cloth — an evening hall format, not a televised tournament.",
      ],
      bullets: [
        "Americana — not about the USA or pool; everyday name for free pyramid because of freedom to choose cue ball and pocket.",
        "Colored (yellow) cue ball in classic and Moscow pyramid — mandatory; in free pyramid after the break any ball on the table may become the cue ball.",
        "Tight pockets (corner approx. 72–73 mm, side approx. 80–81 mm on 12 ft) — a deliberate standard: misses and cushion kicks are common.",
      ],
    },
    {
      id: "federations",
      title: "ICP, RBF, and unified regulations after the 1990s",
      paragraphs: [
        "After the USSR breakup, rules diverged across republics. The International Pyramid Committee (ICP) and Russian Billiard Federation (RBF) from the 1990s developed unified tournament regulations: classic, combined (Moscow), free, and dynamic pyramid.",
        "ICP runs world championships, World Cup, international matches; RBF — Russian championship, Russian Cup, rating series. On billiard.guru the tournament format is shown on the event card — free, dynamic, Moscow, or classic.",
        "Referee seminars, foul penalty tables, handicap and rating rules — all tied to a specific discipline. The mistake cue ball in pocket always foul is typical confusion between classic 71 and free pyramid.",
      ],
      table: {
        headers: ["Organization", "Role", "Disciplines"],
        rows: [
          ["ICP", "International rules, World Cup", "Free, dynamic, Moscow, classic"],
          ["RBF", "Russian championship, rating, refereeing", "Same + regional series"],
          ["Regional federations", "Club leagues, youth sections", "Most often free and dynamic"],
        ],
      },
    },
    {
      id: "disciplines-timeline",
      title: "Six disciplines on one table — how they diverged",
      paragraphs: [
        "On a 12 ft pyramid table, different games use different cue-ball rules, scoring, and points. Below — a brief map; full regulations and history for each — on its own page.",
      ],
      table: {
        headers: ["Discipline", "Essence", "Cue ball in pocket", "Tournament status"],
        rows: [
          [
            "Free (Americana)",
            "No pocket call; after break any ball is cue ball",
            "Counts after contact with object ball (carom pocketing)",
            "Main World Cup and club rating format",
          ],
          [
            "Dynamic (Nevskaya)",
            "15 balls spread on table, not in a pyramid",
            "Same as free pyramid",
            "Second rating-series format, popular on broadcasts",
          ],
          [
            "Combined (Moscow)",
            "Call ball and pocket on every scoring shot",
            "Only if called; otherwise foul",
            "ICP flagship format, championships",
          ],
          [
            "Classic 71",
            "To 71 points by ball numbers; colored cue ball only",
            "Always foul; no carom pocketing",
            "ICP federal and international tournaments",
          ],
          [
            "Kolkhoz",
            "3+ players in rotation, score for previous player",
            "By agreement, often as in free pyramid",
            "Club game, not in ICP program",
          ],
          [
            "Fishki (skittles)",
            "5 wooden skittles, points for knocked pins",
            "Pockets do not count",
            "Amateur format with skittle set",
          ],
        ],
      },
      note: "Before a match on billiard.guru or in a club, always confirm the discipline — cue-ball scoring, penalties, and frame format depend on it.",
    },
    {
      id: "equipment-evolution",
      title: "Table, balls, cloth — how the standard was fixed",
      paragraphs: [
        "Tournament benchmark — 12 ft table with playing surface approx. 354 x 177 cm (ICP tolerances). New clubs increasingly use 10 ft and 9 ft with proportionally smaller pockets; discipline rules are the same, but combinations are shorter.",
        "Phenolic balls, diameter 68.0–68.5 mm, weight approx. 280–285 g — noticeably larger and heavier than pool balls. Set uniformity is checked before a tournament.",
        "Cloth (usually 681 Speed or equivalent), cushion rails, kitchen and foot spot — part of the regulations. Legal shot (contact, cushion or pocket) — a common requirement in almost all disciplines, but sanctions differ.",
      ],
    },
    {
      id: "geography",
      title: "Geography: where pyramid is the main billiards",
      table: {
        headers: ["Region", "Level", "Schools and formats"],
        rows: [
          [
            "Russia (Moscow, St. Petersburg, regions)",
            "Very high",
            "Moscow school — call shots; St. Petersburg — dynamic; everywhere — free and kolkhoz",
          ],
          ["Belarus, Kazakhstan", "High", "Shared regulations with Russia, strong national championships"],
          ["Ukraine, Uzbekistan, Azerbaijan", "Medium–high", "Club networks, local ratings"],
          ["Latvia, Estonia, Lithuania", "Medium", "Diaspora + local 12 ft leagues"],
          ["Germany, Israel, Czechia, USA", "Niche", "Russian-speaking diaspora clubs, rare ICP tournaments"],
          ["China, UAE", "Growing", "Investment in 12 ft halls, invited tournaments"],
        ],
      },
    },
    {
      id: "tournaments-media",
      title: "Tournaments, television, stars",
      paragraphs: [
        "Pyramid World Cup, Russian championship, Kremlin Cup, Pyramid series on Match TV, and streams on YouTube/Rutube built a viewing audience. Televised matches are more often free or dynamic — open table and fast tempo.",
        "Legends of post-Soviet pyramid — world and Russian champions in different disciplines (Moscow, free, classic). Young players often start with free pyramid in a club and move to Moscow pyramid at rating 4+.",
        "On billiard.guru pyramid is the most common table type in tournament cards: free and dynamic dominate regional series; Moscow and classic — at federal and international events.",
      ],
      bullets: [
        "World Cup (ICP) — rotation of disciplines: free, dynamic, combined.",
        "Club kolkhoz and fishki do not air, but shape the mass image of Russian billiards.",
        "Women's, student, and veteran leagues are growing in the regions.",
      ],
    },
    {
      id: "trends",
      title: "What is changing now",
      bullets: [
        "Dynamic (Nevskaya) — format for fast evening series and online broadcasts.",
        "10 ft tables in new clubs: more compact, same rules, different combination geometry.",
        "Digital ratings and registration on billiard.guru — transparent discipline and handicap on the tournament card.",
        "Preserving classic and Moscow pyramid in the ICP program while free pyramid dominates mass club play.",
      ],
    },
  ],
};

export const PYRAMID_GAME_HISTORIES_EN: Record<string, BilliardHistory> = {
  svobodnaya: {
    title: "Historical note: free pyramid",
    intro:
      "Free pyramid (Americana in clubs) is the most popular tournament discipline on the pyramid table in Russia and the CIS. No pocket call, carom pocketing of the cue ball, and the right to play any ball as cue ball after the break.",
    sections: [
      {
        id: "origins",
        title: "How free play took shape",
        paragraphs: [
          "Free pyramid formed as the opposite of strict Moscow pyramid with call shots: the player does not name the pocket in advance, after the break any ball on the table may become the cue ball, scoring — into any of six pockets.",
          "Carom pocketing is the key feature: the cue ball may go in the pocket after contacting an object ball. That is not a foul if contact occurred. Without contact with an object ball — penalty, opponent plays from the hand in the kitchen.",
          "The name Americana stuck in Soviet and post-Soviet clubs by analogy with freedom of choice, not because it came from the USA. American pool — different table, balls, and rules.",
        ],
      },
      {
        id: "tournament-history",
        title: "Tournament history",
        paragraphs: [
          "Since the 1990s free pyramid has been the base of the Pyramid World Cup and most RBF rating series. Formats: to N wins, to 8 balls, matches with rating handicap.",
          "Russian free-pyramid championships gather top players; broadcasts show long runs, combinations, and carom pocketings — spectator-friendly billiards.",
          "On billiard.guru free pyramid is one of the two main formats of regional tournaments alongside dynamic pyramid.",
        ],
        bullets: [
          "Break from the hand in the kitchen; standard rack of 15 white balls + colored cue ball.",
          "Legal shot: object ball pocketed or touches a cushion; otherwise the cue ball must also reach a cushion or pocket.",
          "Run continues until a miss or foul.",
        ],
      },
      {
        id: "geography",
        title: "Where it is played and who is strong",
        table: {
          headers: ["Region", "Feature"],
          rows: [
            ["All Russia", "Club standard No. 1, all levels from basement to Sirius"],
            ["Belarus, Kazakhstan", "National championships, shared ICP regulations"],
            ["St. Petersburg", "Dynamic pyramid is also strong; free pyramid — school base"],
            ["Diaspora (DE, IL, CZ)", "12 ft clubs, local cups"],
          ],
        },
      },
      {
        id: "vs-other",
        title: "Differences from other disciplines on the same table",
        bullets: [
          "Classic 71: colored cue ball only, cue ball in pocket — always foul, no carom pocketing.",
          "Moscow pyramid: call ball and pocket; cue ball in pocket only if called.",
          "Dynamic pyramid: same scoring rules, but 15 balls spread on the table, not in a pyramid.",
          "Kolkhoz: often the same scoring mechanics, but rotation and scoring among three or more players.",
        ],
      },
      {
        id: "trends",
        title: "Modern trends",
        bullets: [
          "Televised matches and streams — main media format of the discipline.",
          "Fast formats (to 8 balls) for evening club series.",
          "Youth tournaments on billiard.guru — entry into RBF rating.",
        ],
      },
    ],
  },
  dinamicheskaya: {
    title: "Historical note: dynamic (Nevskaya) pyramid",
    intro:
      "Dynamic pyramid is a St. Petersburg discipline with a broken pyramid: 15 balls are not racked in a triangle but spread on the table before the first shot. Cue-ball rules, scoring, and fouls — as in free pyramid.",
    sections: [
      {
        id: "origins",
        title: "Nevskaya school and the birth of the format",
        paragraphs: [
          "Dynamic pyramid (Nevskaya) was born in Leningrad and St. Petersburg clubs in the 1980s–1990s as a faster, more spectacular variant: no need to break a tight pyramid — the table is open from the first stroke.",
          "15 object balls are placed on lines or zones per regulations (not in a triangle at the foot spot). Colored cue ball — in the kitchen. First shot — from the hand; thereafter rules match free pyramid: any ball as cue ball, carom pocketing, run until foul.",
          "The name Nevskaya stuck thanks to TV shows and Northwest tournaments; Moscow and regions adopted it as the second standard of rating series.",
        ],
      },
      {
        id: "why-dynamic",
        title: "Why dynamic",
        paragraphs: [
          "Less time on break and escape from the opening position — faster frame tempo. For viewers and broadcasts the table looks alive from the first seconds.",
          "Players with strong positional play and long runs get the same advantages as in free pyramid, but without the lottery of a tight pyramid break.",
          "Tournaments often alternate free and dynamic in one bracket — different disciplines, one table, one player rating.",
        ],
      },
      {
        id: "geography",
        title: "Geography",
        bullets: [
          "St. Petersburg and Leningrad Oblast — historical center, hence the name.",
          "Moscow, Yekaterinburg, Novosibirsk — standard on rating series.",
          "Streaming platforms: format popular with viewers because of the open table.",
          "Abroad — rare except diaspora tournaments with ICP program.",
        ],
      },
      {
        id: "tournaments",
        title: "Tournaments and media",
        bullets: [
          "World Cup — dynamic pyramid in discipline rotation.",
          "Regional RBF series — often a free + dynamic pair in one event.",
          "To 8 balls — typical for club evenings.",
        ],
      },
      {
        id: "trends",
        title: "Trends",
        bullets: [
          "Growth among young players: faster frame, easier for spectators to follow.",
          "Doubles and team formats in clubs.",
          "On billiard.guru — second most common format after free pyramid.",
        ],
      },
    ],
  },
  kombinirovannaya: {
    title: "Historical note: combined (Moscow) pyramid",
    intro:
      "Moscow (combined) pyramid is an official discipline with mandatory call of ball and pocket on every scoring shot. Points by ball numbers, target 71 or 76. Cue ball — colored only; in pocket — only if called.",
    sections: [
      {
        id: "origins",
        title: "Moscow school and call shots",
        paragraphs: [
          "Combined pyramid developed in Moscow sports societies from the 1950s: the player names ball number and pocket before the shot; after the shot the call cannot be changed. Wrong ball or pocket — penalty, ball spotted on the foot spot.",
          "Combined — because one frame mixes pocket scoring and strict count by numbers (unlike purely free play without call). Target 71 or 76 points depends on tournament regulations.",
          "The discipline became the benchmark for USSR, Russian, and international ICP championships. Referee penalty tables for foul, uncalled ball, and cue ball in pocket — official, not by eye.",
        ],
      },
      {
        id: "rules-evolution",
        title: "Evolution of regulations",
        paragraphs: [
          "Call applies to the cue ball too: you may strike with the colored ball only by the rules; cue ball in pocket counts only if the pocket for the cue ball was announced (rare but legal technique).",
          "Penalty points to opponent: for foul, uncalled ball, cue ball in pocket without call — per ICP table (often -1, -2, or ball value).",
          "After foul opponent plays from the hand in the kitchen. Repeated foul in a run may award a penalty ball.",
        ],
        bullets: [
          "Colored (yellow) cue ball only — whites never become cue ball.",
          "No carom pocketing of cue ball without calling the cue-ball pocket.",
          "High refereeing demands — typical format of championship finals.",
        ],
      },
      {
        id: "geography",
        title: "Where Moscow pyramid is strong",
        table: {
          headers: ["Region", "Comment"],
          rows: [
            ["Moscow and Central Federal District", "Most schools, referee courses, sections"],
            ["ICP championships", "Moscow or classic — main disciplines"],
            ["Regional clubs", "More often free; Moscow — for serious tournaments"],
            ["Belarus, Kazakhstan", "Strong players, shared rules with Russia"],
          ],
        },
      },
      {
        id: "vs-klassicheskaya",
        title: "Moscow vs classic 71",
        bullets: [
          "Both: colored cue ball only, points by numbers, cue ball in pocket — foul (in Moscow except when called).",
          "Moscow: mandatory call of ball and pocket on every scoring shot.",
          "Classic 71: no pocket call required; play to 71 points by sum of numbers.",
          "Both in ICP program; Moscow — calling card of televised finals.",
        ],
      },
      {
        id: "trends",
        title: "Present day",
        bullets: [
          "Retains top-discipline status in RBF rating.",
          "Players move from free to Moscow pyramid at rating 4+.",
          "Russian championship final broadcasts — main media image of strict pyramid.",
        ],
      },
    ],
  },
  "klassicheskaya-71": {
    title: "Historical note: classic pyramid (71 points)",
    intro:
      "Classic (small) pyramid — play to 71 points by sum of pocketed ball numbers. Colored cue ball only, no choosing any ball as cue ball, no carom pocketing of cue ball. For a long time — the core of official USSR competition.",
    sections: [
      {
        id: "origins",
        title: "Small pyramid and Soviet sport",
        paragraphs: [
          "Classic pyramid to 71 points is one of the oldest official disciplines on the Russian table. Fifteen numbered white balls 1–15, colored cue ball, scoring — object ball in pocket only.",
          "Unlike free pyramid, a white ball never becomes the cue ball. Cue ball in pocket — always foul, no carom pocketing. Pocket call not required (unlike Moscow pyramid).",
          "In the 1960s–1980s classic and Moscow pyramid dominated sports committees; free pyramid grew in clubs. After the 1990s free pyramid became more mass-market, but classic remained in ICP and championship programs.",
        ],
      },
      {
        id: "scoring",
        title: "Scoring and frame format",
        paragraphs: [
          "Points = sum of pocketed ball numbers. Frame to 71 (or another target per regulations). Strategy: high numbers, position, no risk of cue ball in pocket.",
          "Break from the hand in the kitchen under general pyramid rules. Legal shot mandatory; miss and illegal shot — foul, opponent from kitchen.",
          "Playing with wrong ball as cue ball — foul. General pyramid foul list without free-pyramid leniency.",
        ],
        bullets: [
          "Colored cue ball only throughout the frame.",
          "Cue ball in pocket — always penalty, not scoring.",
          "No pocket call — simpler for amateurs than Moscow, but stricter on cue ball than free pyramid.",
        ],
      },
      {
        id: "geography",
        title: "Where it appears today",
        bullets: [
          "Russian and world championships under ICP — classic in the program.",
          "Specialized sections and older-generation players.",
          "In an ordinary club rarer than free — needs regulation knowledge and referee at serious tournaments.",
          "Regions: strong masters in Moscow, Ufa, Kazan, Minsk.",
        ],
      },
      {
        id: "vs-svobodnaya",
        title: "Why it is confused with free pyramid",
        paragraphs: [
          "Both — same table, 16 balls, tight pockets. But cue-ball rules are opposite in strictness: in free pyramid cue ball in pocket after object-ball contact — scoring; in classic 71 — always foul.",
          "The phrase cue ball in pocket not allowed on a general table page is wrong: it is true only for classic 71 and Moscow pyramid (without call), not for free and dynamic pyramid.",
        ],
      },
      {
        id: "trends",
        title: "Modern role",
        bullets: [
          "Retained in ICP international calendar.",
          "Base for learning strict stroke without carom pocketings.",
          "On billiard.guru — rarer than free, but listed on federal event cards.",
        ],
      },
    ],
  },
  kolhoz: {
    title: "Historical note: kolkhoz",
    intro:
      "Kolkhoz, troynik, kolbasa — collective play for three or more at one pyramid table. Not in the ICP program, but defines the look of a Russian hall on a weeknight.",
    sections: [
      {
        id: "origins",
        title: "Origin of the name and mechanics",
        paragraphs: [
          "Kolkhoz is the folk name for a format where three or more players sit in rotation. You pocket not for yourself but for the previous participant; score is kept as the difference with whoever follows you in order.",
          "Scoring mechanics often borrow free pyramid: carom pocketing, any ball as cue ball after break — but only if agreed at the table. Foul penalty: in white kolkhoz often -1; in color kolkhoz minus value of called ball.",
          "The format never entered official sport — purely club tradition, like house rules on pool breaks.",
        ],
      },
      {
        id: "variants",
        title: "White and color kolkhoz",
        paragraphs: [
          "White kolkhoz — classic: white balls, colored cue ball, simple scoring (-1 for foul).",
          "Color kolkhoz — call ball/pocket, points by colors or numbers; rules vary strongly by club. Before play, always agree: who you score for, what counts as foul, what penalty.",
          "Kolbasa — variant with a long queue (4–6 players), popular in halls with a regular crowd.",
        ],
        bullets: [
          "3+ players, turn in rotation.",
          "After foul — next player in rotation shoots.",
          "On billiard.guru almost never appears in ratings.",
        ],
      },
      {
        id: "geography",
        title: "Where kolkhoz lives",
        bullets: [
          "Any club with pyramid in Russia — especially Friday–Sunday.",
          "Moscow, regions — equally mass-market.",
          "TV tournaments and World Cup — format absent.",
          "Emigrant clubs — way to play Russian-style in company.",
        ],
      },
      {
        id: "culture",
        title: "Social role",
        paragraphs: [
          "Kolkhoz is a social format: no referee needed, agreements and rotation speed matter. Many start with troynik, not tournament free pyramid.",
          "Conflicts from different house rules — main cause of disputes; pre-game checklist on the rules page helps reduce them.",
        ],
      },
      {
        id: "trends",
        title: "Today",
        bullets: [
          "Steadily popular despite growth of rating tournaments.",
          "Clubs run kolkhoz evenings without RBF registration.",
          "Color kolkhoz — trend in selected Moscow and regional halls.",
        ],
      },
    ],
  },
  fishki: {
    title: "Historical note: fishki (skittles on pyramid)",
    intro:
      "Fishki — five wooden skittles on a pyramid table; points for knocked pins, pockets do not count. Club format, not to be confused with Italian billiard a cinque pin.",
    sections: [
      {
        id: "origins",
        title: "Origin on the Russian table",
        paragraphs: [
          "Pin games on billiard tables are known in Europe (Italian and French variants with pins). Russian fishki — local adaptation: five wooden skittles on the table, players strike them with the cue ball per hall rules.",
          "Pockets do not score — only knocked skittles. Direct cue-ball hit on a skittle is often a foul; points go to the opponent. Run: while you knock skittles without foul, you keep the table.",
          "The format needs no ICP tournament infrastructure — a skittle set and players who know local regulations.",
        ],
      },
      {
        id: "vs-italian",
        title: "Not to be confused with Italian carom",
        bullets: [
          "Billiard a cinque pin — carom table without pockets, different balls and rules.",
          "Russian fishki — on 12 ft pyramid pocket table.",
          "Points only for skittles, not balls in pockets.",
        ],
      },
      {
        id: "equipment",
        title: "Equipment and setup",
        paragraphs: [
          "Five wooden skittles (pins), usually in the central zone. Layout and shot zones — per club rules.",
          "Balls — standard pyramid 68 mm. Cue ball — colored, as in other disciplines on this table.",
          "Not every hall has a set; confirm with staff before visiting.",
        ],
      },
      {
        id: "geography",
        title: "Where it is played",
        bullets: [
          "Fully equipped clubs — Moscow, major regional centers.",
          "Amateur play more often than rating series.",
          "On billiard.guru the table may be pyramid; fishki — by agreement in the hall.",
          "ICP tournaments — discipline not represented.",
        ],
      },
      {
        id: "culture",
        title: "Club culture",
        paragraphs: [
          "Fishki — entertainment and stroke-precision training, alternative to evening kolkhoz. Rules are highly local: one hall allows carom to skittle, another — only indirect hit.",
          "Fishki rules do not carry over to tournament free or Moscow pyramid — separate game.",
        ],
      },
    ],
  },
};
