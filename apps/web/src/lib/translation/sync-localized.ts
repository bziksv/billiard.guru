import { translateText, translateTitleBody } from "@/lib/translation/translate";
import type { PublishLocale } from "@/lib/translation/types";

export type LocalizedTitleBodyFields = {
  title: string;
  body: string | null;
  titleEn: string | null;
  bodyEn: string | null;
};

/**
 * Соглашение хранения: `title`/`body` — русский, `titleEn`/`bodyEn` — английский.
 * При `publishLocale: 'ru'` переводим RU→EN; при `'en'` — EN→RU (для будущей EN-админки).
 */
export async function syncLocalizedTitleBody(input: {
  publishLocale?: PublishLocale;
  title: string;
  body?: string | null;
}): Promise<LocalizedTitleBodyFields> {
  const publishLocale = input.publishLocale ?? "ru";
  const primaryTitle = input.title.trim();
  const primaryBody = input.body?.trim() || null;

  if (publishLocale === "ru") {
    const translated = await translateTitleBody(primaryTitle, primaryBody ?? "", "ru", "en");
    return {
      title: primaryTitle,
      body: primaryBody,
      titleEn: translated?.title ?? null,
      bodyEn: primaryBody && translated?.body ? translated.body : null,
    };
  }

  const translated = await translateTitleBody(primaryTitle, primaryBody ?? "", "en", "ru");
  return {
    title: translated?.title ?? primaryTitle,
    body: primaryBody ? (translated?.body ?? primaryBody) : null,
    titleEn: primaryTitle,
    bodyEn: primaryBody,
  };
}

export type LocalizedDescriptionFields = {
  description: string | null;
  descriptionEn: string | null;
};

export async function syncLocalizedDescription(input: {
  publishLocale?: PublishLocale;
  description?: string | null;
}): Promise<LocalizedDescriptionFields> {
  const publishLocale = input.publishLocale ?? "ru";
  const raw = input.description?.trim() || null;
  if (!raw) {
    return { description: null, descriptionEn: null };
  }

  if (publishLocale === "ru") {
    const descriptionEn = await translateText(raw, "ru", "en");
    return { description: raw, descriptionEn };
  }

  const description = (await translateText(raw, "en", "ru")) ?? raw;
  return { description, descriptionEn: raw };
}

/** Короткая строка (название турнира и т.п.): `text` = RU, `textEn` = EN. */
export async function syncLocalizedLabel(input: {
  publishLocale?: PublishLocale;
  text: string;
}): Promise<{ text: string; textEn: string | null }> {
  const publishLocale = input.publishLocale ?? "ru";
  const trimmed = input.text.trim();
  if (!trimmed) return { text: "", textEn: null };

  if (publishLocale === "ru") {
    const textEn = await translateText(trimmed, "ru", "en");
    return { text: trimmed, textEn };
  }

  const text = (await translateText(trimmed, "en", "ru")) ?? trimmed;
  return { text, textEn: trimmed };
}
