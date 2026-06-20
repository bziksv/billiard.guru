import type { ClubTableFormatId } from "@/lib/club-table-formats";
import type { GuideSection } from "@/lib/guide-content";
import { PYRAMID_TABLE } from "@/lib/billiard-rules/pyramid-content";
import { POOL_TABLE } from "@/lib/billiard-rules/pool-content";
import { SNOOKER_TABLE } from "@/lib/billiard-rules/snooker-content";
import { CHINESE_POOL_TABLE } from "@/lib/billiard-rules/chinese-pool-content";
import { CAROM_TABLE } from "@/lib/billiard-rules/carom-content";

export type BilliardTableSpec = {
  label: string;
  value: string;
};

export type BilliardEquipmentGroup = {
  title: string;
  table: { headers: string[]; rows: string[][] };
};

export type BilliardTableEquipment = {
  title: string;
  intro?: string;
  groups: BilliardEquipmentGroup[];
  note?: string;
};

export type BilliardTableChecklist = {
  title: string;
  intro?: string;
  items: { text: string; hint?: string }[];
};

export type BilliardRulesSeo = {
  title: string;
  description: string;
  keywords: string[];
};

export type BilliardHistory = {
  title: string;
  intro?: string;
  sections: GuideSection[];
};

export type BilliardGame = {
  slug: string;
  title: string;
  subtitle?: string;
  tagline: string;
  /** Короткая метка на карточке */
  badge?: string;
  /** Переопределение meta title / description / keywords */
  seo?: BilliardRulesSeo;
  sections: GuideSection[];
  /** Историческая справка после регламента */
  history?: BilliardHistory;
};

export type BilliardTableType = {
  id: ClubTableFormatId;
  slug: string;
  title: string;
  lead: string;
  /** Краткое описание для карточки на главной */
  teaser: string;
  /** Показывать лузы на иконке стола */
  pockets: boolean;
  /** Подпись на карточке: «6 узких луз», «Без луз» и т.п. */
  pocketsLabel: string;
  specs: BilliardTableSpec[];
  overview: string[];
  /** Детальные параметры оборудования (шары, лузы, стол) */
  equipment?: BilliardTableEquipment;
  /** Чек-лист перед игрой или турниром */
  checklist?: BilliardTableChecklist;
  /** Meta title / description / keywords для страницы типа стола */
  seo?: BilliardRulesSeo;
  games: BilliardGame[];
  commonFouls?: string[];
  /** История стола, география, культура игры */
  history?: BilliardHistory;
};

export const BILLIARD_GENERAL_SECTIONS: GuideSection[] = [
  {
    id: "handicap",
    title: "Фора в турнирах",
    paragraphs: [
      "На billiard.guru по умолчанию фора считается по разнице рейтингов с шагом 0,5: полный шар в каждой партии, при нечётной разнице — дополнительный шар в нечётных партиях. Сильнейшему назначается «минус».",
      "При проведении турнира организатор может отключить учёт половинок — тогда для форы берутся только целые рейтинги (например, 3 vs 1,5 → разница 2 шара, а не 2,5).",
      "Точные правила форы всегда смотрите в карточке турнира перед матчем.",
    ],
  },
  {
    id: "etiquette",
    title: "Этикет за столом",
    bullets: [
      "Не отвлекайте соперника во время прицеливания и удара.",
      "Согласуйте перерывы и время на разминку до начала партии.",
      "После матча — рукопожатие и фиксация результата у судьи или в системе.",
      "Спорные ситуации решает судья турнира или старший по залу.",
    ],
  },
  {
    id: "tournament-note",
    title: "Регламент турнира важнее",
    paragraphs: [
      "Этот раздел — ориентир для игроков и судей. Точные правила, санкции и формат партии всегда берите из регламента конкретного турнира или федерации — они могут отличаться от клубной игры.",
    ],
  },
];

export const BILLIARD_TABLE_TYPES: BilliardTableType[] = [
  PYRAMID_TABLE,
  POOL_TABLE,
  SNOOKER_TABLE,
  CHINESE_POOL_TABLE,
  CAROM_TABLE,
];

export const RULES_INDEX_INTRO =
  "Выберите тип стола — как в каталоге клубов на billiard.guru. Внутри каждого раздела — игры и дисциплины с кратким регламентом. Для турнира всегда смотрите официальный регламент события.";
