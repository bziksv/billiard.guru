import type { Prisma } from "@/generated/prisma/client";
import { deepseekChatCompletion, isTranslationEnabled } from "@/lib/translation/deepseek";
import { syncLocalizedDescription } from "@/lib/translation/sync-localized";
import { translateText } from "@/lib/translation/translate";
import type { PriceTier } from "@/lib/club-schedule";
import { priceTiersToJson } from "@/lib/club-schedule";
import { logger } from "@/lib/logger";

export type ClubLocalizedTextFields = {
  addressEn: string | null;
  gamePriceEn: string | null;
  workingHoursEn: string | null;
  priceTiersEn: ReturnType<typeof priceTiersToJson>;
};

async function translateOptionalText(text?: string | null): Promise<string | null> {
  const trimmed = text?.trim() || null;
  if (!trimmed) return null;
  return (await translateText(trimmed, "ru", "en")) ?? null;
}

/** Переводит label/price/note тарифов; days и время сохраняются как есть. */
export async function syncLocalizedPriceTiers(tiers: PriceTier[]): Promise<PriceTier[] | null> {
  if (tiers.length === 0) return null;
  if (!isTranslationEnabled()) return null;

  const payload = tiers.map((tier) => ({
    label: tier.label,
    price: tier.price,
    note: tier.note ?? "",
  }));

  const content = await deepseekChatCompletion({
    jsonMode: true,
    messages: [
      {
        role: "user",
        content:
          `Translate billiard club price tier fields from Russian to English.\n` +
          `Return JSON: {"tiers":[{"label":"...","price":"...","note":"..."}]} with exactly ${tiers.length} items.\n` +
          `Keep currency symbols and numbers in price strings. Empty note stays "".\n\n` +
          JSON.stringify(payload),
      },
    ],
    temperature: 0.2,
  });

  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as {
      tiers?: Array<{ label?: string; price?: string; note?: string }>;
    };
    const translated = parsed.tiers;
    if (!Array.isArray(translated) || translated.length !== tiers.length) {
      logger.warn("DeepSeek price tiers JSON length mismatch");
      return null;
    }

    return tiers.map((tier, i) => {
      const row = translated[i]!;
      return {
        ...tier,
        label: row.label?.trim() || tier.label,
        price: row.price?.trim() || tier.price,
        note: row.note?.trim() ? row.note.trim() : tier.note,
      };
    });
  } catch (error) {
    logger.error({ error, content: content.slice(0, 200) }, "Failed to parse price tiers translation");
    return null;
  }
}

export async function syncLocalizedClubTextFields(input: {
  address?: string | null;
  gamePrice?: string | null;
  workingHours?: string | null;
  priceTiers?: PriceTier[];
}): Promise<Partial<ClubLocalizedTextFields>> {
  const result: Partial<ClubLocalizedTextFields> = {};

  if (input.address !== undefined) {
    result.addressEn = await translateOptionalText(input.address);
  }
  if (input.gamePrice !== undefined) {
    result.gamePriceEn = await translateOptionalText(input.gamePrice);
  }
  if (input.workingHours !== undefined) {
    result.workingHoursEn = await translateOptionalText(input.workingHours);
  }
  if (input.priceTiers !== undefined) {
    const translated = await syncLocalizedPriceTiers(input.priceTiers);
    result.priceTiersEn = translated ? priceTiersToJson(translated) : null;
  }

  return result;
}

/** Поля клуба для Prisma update после PATCH (описание + адрес/цены/график). */
export async function buildClubLocalizedUpdate(input: {
  description?: string | null;
  address?: string | null;
  gamePrice?: string | null;
  workingHours?: string | null;
  priceTiers?: PriceTier[];
}) {
  const data: Record<string, unknown> = {};

  if (input.description !== undefined) {
    const desc = await syncLocalizedDescription({ description: input.description });
    data.description = desc.description;
    data.descriptionEn = desc.descriptionEn;
  }

  const textFields = await syncLocalizedClubTextFields({
    ...(input.address !== undefined && { address: input.address }),
    ...(input.gamePrice !== undefined && { gamePrice: input.gamePrice }),
    ...(input.workingHours !== undefined && { workingHours: input.workingHours }),
    ...(input.priceTiers !== undefined && { priceTiers: input.priceTiers }),
  });

  if (textFields.addressEn !== undefined) data.addressEn = textFields.addressEn;
  if (textFields.gamePriceEn !== undefined) data.gamePriceEn = textFields.gamePriceEn;
  if (textFields.workingHoursEn !== undefined) data.workingHoursEn = textFields.workingHoursEn;
  if (textFields.priceTiersEn !== undefined) data.priceTiersEn = textFields.priceTiersEn;

  return data;
}

export function clubLocalizedToPrisma(data: Record<string, unknown>): Prisma.ClubUpdateInput {
  const out: Prisma.ClubUpdateInput = {};
  if (data.description !== undefined) out.description = data.description as string | null;
  if (data.descriptionEn !== undefined) out.descriptionEn = data.descriptionEn as string | null;
  if (data.addressEn !== undefined) out.addressEn = data.addressEn as string | null;
  if (data.gamePriceEn !== undefined) out.gamePriceEn = data.gamePriceEn as string | null;
  if (data.workingHoursEn !== undefined) out.workingHoursEn = data.workingHoursEn as string | null;
  if (data.priceTiersEn !== undefined) {
    out.priceTiersEn = data.priceTiersEn as Prisma.InputJsonValue;
  }
  return out;
}
