import type { BilliardTableType } from "@/lib/billiard-rules/content";
import { CAROM_TABLE_EN } from "@/lib/billiard-rules/en/carom-content";
import { CHINESE_POOL_TABLE_EN } from "@/lib/billiard-rules/en/chinese-pool-content";
import { POOL_TABLE_EN } from "@/lib/billiard-rules/en/pool-content";
import { PYRAMID_TABLE_EN } from "@/lib/billiard-rules/en/pyramid-content";
import { SNOOKER_TABLE_EN } from "@/lib/billiard-rules/en/snooker-content";

/** Order matches RU: pyramid, pool, snooker, chinese-pool, carom */
export const BILLIARD_TABLE_TYPES_EN: BilliardTableType[] = [
  PYRAMID_TABLE_EN,
  POOL_TABLE_EN,
  SNOOKER_TABLE_EN,
  CHINESE_POOL_TABLE_EN,
  CAROM_TABLE_EN,
];
