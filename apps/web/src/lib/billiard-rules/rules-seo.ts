import type { BilliardGame, BilliardRulesSeo, BilliardTableType } from "@/lib/billiard-rules/content";

const SNOOKER_TABLE_SEO: BilliardRulesSeo = {
  title: "Снукер — правила, параметры стола и классический формат",
  description:
    "Справочник по снукеру: 15 красных, 6 цветов, фреймы и матчи. Стол 12 ft, узкие лузы, шары 52,5–53,5 mm. Для игроков и судей.",
  keywords: [
    "снукер правила",
    "снукер бильярд",
    "фрейм снукер",
    "красные и цвета",
    "завод снукер",
    "стол 12 ft снукер",
    "максимум 147",
    "классический снукер",
  ],
};

const SNOOKER_GAME_SEO: Record<string, BilliardRulesSeo> = {
  klassicheskiy: {
    title: "Классический снукер — правила",
    description:
      "Правила классического снукера: красный + цвет, фаза цветов, разбой из D-зоны, заводы, штрафные очки и матч до N фреймов.",
    keywords: [
      "классический снукер",
      "правила снукера",
      "фрейм снукер",
      "красные цвета снукер",
      "завод снукер",
      "снукер бильярд",
    ],
  },
};

const CHINESE_POOL_TABLE_SEO: BilliardRulesSeo = {
  title: "Китайский пул — правила, параметры стола и китайская восьмёрка",
  description:
    "Справочник по китайскому пулу: китайская восьмёрка, жёсткий разбой, заказ лузы, шар в руке. Стол 9 ft, шары 57 mm. Для игроков и судей.",
  keywords: [
    "китайский пул",
    "китайская восьмёрка",
    "chinese 8 ball правила",
    "правила китайского пула",
    "разбой китайский пул",
    "заказ лузы",
    "стол 9 ft",
    "шары пул 57 mm",
  ],
};

const CHINESE_POOL_GAME_SEO: Record<string, BilliardRulesSeo> = {
  "kitayskaya-vosmerka": {
    title: "Китайская восьмёрка — правила",
    description:
      "Правила китайской восьмёрки: сплошные и полоски, жёсткий разбой, заказ лузы, три фола подряд и игра на чёрную. Формат азиатских лиг.",
    keywords: [
      "китайская восьмёрка",
      "chinese 8 ball",
      "правила китайского пула",
      "китайский пул",
      "сплошные полоски",
      "разбой восьмёрка",
    ],
  },
};

const CAROM_TABLE_SEO: BilliardRulesSeo = {
  title: "Карамболь — правила, дисциплины и параметры стола",
  description:
    "Справочник по карамболю: трёхбанд, прямой карамболь, кадр. Стол 10 ft без луз, три шара 61,5 mm. Для игроков и судей.",
  keywords: [
    "карамболь правила",
    "карамболь бильярд",
    "трёхбанд",
    "3 cushion бильярд",
    "прямой карамболь",
    "кадр бильярд",
    "стол без луз",
    "три борта",
  ],
};

const CAROM_GAME_SEO: Record<string, BilliardRulesSeo> = {
  trehband: {
    title: "Трёхбанд (три борта) — правила",
    description:
      "Правила трёхбанда: три отскока от бортов и касание двух шаров за удар, расстановка, серия очков, фолы и формат матча.",
    keywords: [
      "трёхбанд",
      "3 cushion",
      "три борта бильярд",
      "правила трёхбанда",
      "карамболь",
    ],
  },
  pryamoy: {
    title: "Прямой карамболь — правила",
    description:
      "Правила прямого карамболя: очко за касание двух шаров, без обязательных бортов. Базовая дисциплина для обучения карамболю.",
    keywords: [
      "прямой карамболь",
      "straight rail",
      "карамболь правила",
      "два шара карамболь",
    ],
  },
  kadre: {
    title: "Кадр — правила карамболя",
    description:
      "Правила кадра: игра в ограниченной зоне на столе, зачётные касания внутри кадра, варианты 47/2 и 52/2.",
    keywords: [
      "кадр бильярд",
      "cadre billiards",
      "карамболь кадр",
      "игра в зоне",
      "карамболь правила",
    ],
  },
};

const POOL_TABLE_SEO: BilliardRulesSeo = {
  title: "Пул — правила, дисциплины и параметры стола",
  description:
    "Справочник по пулу: восьмёрка, девятка, десятка, прямой пул. Стол 7–9 ft, шары 57 mm, широкие лузы. Для игроков и судей.",
  keywords: [
    "пул бильярд",
    "правила пула",
    "восьмёрка бильярд",
    "девятка пул",
    "десятка пул",
    "прямой пул",
    "14.1 бильярд",
    "стол 9 ft",
    "шары пул 57 mm",
  ],
};

const POOL_GAME_SEO: Record<string, BilliardRulesSeo> = {
  "8-ball": {
    title: "Восьмёрка (классический пул) — правила",
    description:
      "Правила восьмёрки: сплошные и полоски, чёрная восьмёрка, разбой, выбор группы, фолы и шар в руке. Классический формат в клубах.",
    keywords: [
      "восьмёрка бильярд",
      "8 ball правила",
      "классический пул",
      "сплошные полоски",
      "правила восьмёрки",
      "пул бильярд",
    ],
  },
  "9-ball": {
    title: "Девятка (пул по номерам) — правила",
    description:
      "Правила девятки: шары 1–9, игра по номерам, разбой, отталкивание после разбоя, шар на удар и типичные фолы. Турнирная дисциплина.",
    keywords: [
      "девятка пул",
      "9 ball правила",
      "пул по номерам",
      "правила девятки",
      "пул бильярд",
    ],
  },
  "10-ball": {
    title: "Десятка (пул с заказом) — правила",
    description:
      "Правила десятки: 10 шаров, заказ шара и лузы на каждый удар, игра по номерам. Официальная дисциплина ассоциации пула.",
    keywords: [
      "десятка пул",
      "10 ball правила",
      "пул с заказом",
      "правила десятки",
      "пул бильярд",
    ],
  },
  "straight-pool": {
    title: "Прямой пул (14.1) — правила",
    description:
      "Правила прямого пула: набор очков до 100/150, переворот пирамиды, заказ лузы, позиционная игра. Классика американского бильярда.",
    keywords: [
      "прямой пул",
      "14.1 бильярд",
      "straight pool правила",
      "бесконечная пирамида",
      "пул бильярд",
    ],
  },
};

const PYRAMID_TABLE_SEO: BilliardRulesSeo = {
  title: "Пирамида — правила, дисциплины и параметры стола",
  description:
    "Справочник по русской пирамиде: свободная, динамическая, московская, колхоз, фишки. Шары 68 mm, узкие лузы 72–81 mm, стол 12 ft. Для игроков и судей.",
  keywords: [
    "русская пирамида",
    "правила пирамиды",
    "русский бильярд правила",
    "свободная пирамида",
    "динамическая пирамида",
    "московская пирамида",
    "колхоз бильярд",
    "фишки бильярд",
    "лузы пирамида",
    "шары пирамида 68 mm",
    "стол 12 ft",
  ],
};

const PYRAMID_GAME_SEO: Record<string, BilliardRulesSeo> = {
  svobodnaya: {
    title: "Свободная (американка) пирамида — правила",
    description:
      "Правила свободной пирамиды: разбой из дома, любой шар как биток, зачёт в лузу, серия ударов и типичные фолы. Турнирная дисциплина русского бильярда.",
    keywords: [
      "свободная пирамида",
      "americana",
      "американка бильярд",
      "free pyramid",
      "правила свободной пирамиды",
      "разбой пирамида",
      "русский бильярд",
    ],
  },
  dinamicheskaya: {
    title: "Динамическая (невская) пирамида — правила",
    description:
      "Динамическая (невская) пирамида: разбитая пирамида перед стартом, быстрый темп, те же правила зачёта, что в свободной. Для клубных турниров и телематчей.",
    keywords: [
      "динамическая пирамида",
      "невская пирамида",
      "dynamic pyramid",
      "правила динамической пирамиды",
      "русский бильярд",
    ],
  },
  kombinirovannaya: {
    title: "Комбинированная (московская) пирамида — правила",
    description:
      "Московская пирамида: заказ шара и лузы, очки по номерам, рубеж 71/76. Штрафы и турнирный регламент МКП/ФРБ.",
    keywords: [
      "московская пирамида",
      "комбинированная пирамида",
      "combined pyramid",
      "call shot пирамида",
      "правила московской пирамиды",
      "71 очко пирамида",
    ],
  },
  "klassicheskaya-71": {
    title: "Классическая пирамида 71 очко — правила",
    description:
      "Классическая (малая) пирамида: счёт по номерам шаров до 71 очка, цветной биток, без свободного выбора битка. Официальная дисциплина русского бильярда.",
    keywords: [
      "классическая пирамида",
      "71 очко пирамида",
      "малая пирамида",
      "правила классической пирамиды",
      "русский бильярд",
    ],
  },
  kolhoz: {
    title: "Колхоз (тройник, колбаса) — правила игры в пирамиду",
    description:
      "Колхоз (тройник, колбаса): 3+ игрока, забиваете предыдущему, счёт — разница с следующим. Классический и цветной вариант, заказ и штрафы.",
    keywords: [
      "колхоз бильярд",
      "колхоз пирамида",
      "тройник бильярд",
      "колбаса бильярд",
      "коллективная игра пирамида",
      "правила колхоз",
    ],
  },
  fishki: {
    title: "Фишки (кегли) — правила игры на пирамидном столе",
    description:
      "Фишки на русской пирамиде: 5 деревянных кеглей, очки за сбитые фишки, лузы не засчитываются. Клубный формат, отличие от итальянского 5 фишек.",
    keywords: [
      "фишки бильярд",
      "фишки пирамида",
      "кегли бильярд",
      "игра фишки правила",
      "русский бильярд клуб",
    ],
  },
};

function truncateDescription(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function uniqueKeywords(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const key = word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(word.trim());
  }
  return result;
}

export function resolveRulesTableSeo(table: BilliardTableType): BilliardRulesSeo {
  if (table.seo) return table.seo;

  if (table.slug === "pyramid") {
    return PYRAMID_TABLE_SEO;
  }

  if (table.slug === "pool") {
    return POOL_TABLE_SEO;
  }

  if (table.slug === "snooker") {
    return SNOOKER_TABLE_SEO;
  }

  if (table.slug === "chinese-pool") {
    return CHINESE_POOL_TABLE_SEO;
  }

  if (table.slug === "carom") {
    return CAROM_TABLE_SEO;
  }

  const gameTitles = table.games.map((g) => g.title);
  return {
    title: `${table.title} — правила и дисциплины`,
    description: truncateDescription(
      `${table.lead} ${gameTitles.slice(0, 4).join(", ")}${gameTitles.length > 4 ? " и др." : ""}. Справочник billiard.guru.`,
    ),
    keywords: uniqueKeywords([
      table.title,
      "правила бильярда",
      table.pocketsLabel,
      ...gameTitles,
    ]),
  };
}

export function resolveRulesGameSeo(
  table: BilliardTableType,
  game: BilliardGame,
): BilliardRulesSeo {
  if (game.seo) return game.seo;

  if (table.slug === "pyramid" && PYRAMID_GAME_SEO[game.slug]) {
    return PYRAMID_GAME_SEO[game.slug];
  }

  if (table.slug === "pool" && POOL_GAME_SEO[game.slug]) {
    return POOL_GAME_SEO[game.slug];
  }

  if (table.slug === "snooker" && SNOOKER_GAME_SEO[game.slug]) {
    return SNOOKER_GAME_SEO[game.slug];
  }

  if (table.slug === "chinese-pool" && CHINESE_POOL_GAME_SEO[game.slug]) {
    return CHINESE_POOL_GAME_SEO[game.slug];
  }

  if (table.slug === "carom" && CAROM_GAME_SEO[game.slug]) {
    return CAROM_GAME_SEO[game.slug];
  }

  const subtitle = game.subtitle?.replace(/·.*/, "").trim();
  return {
    title: `${game.title} — правила на столе «${table.title}»`,
    description: truncateDescription(
      `${game.tagline} Регламент, типичные нарушения и нюансы дисциплины «${game.title}» на billiard.guru.`,
    ),
    keywords: uniqueKeywords([
      game.title,
      subtitle ?? "",
      table.title,
      "правила бильярда",
      `${game.title} правила`,
    ]),
  };
}
