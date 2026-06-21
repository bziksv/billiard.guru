import { logger } from "@/lib/logger";
import { deepseekChatCompletion, isTranslationEnabled } from "@/lib/translation/deepseek";
import type { PublishLocale } from "@/lib/translation/types";

function languageName(locale: PublishLocale): string {
  return locale === "ru" ? "Russian" : "English";
}

export async function translateText(
  text: string,
  from: PublishLocale,
  to: PublishLocale,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (from === to) return trimmed;
  if (!isTranslationEnabled()) return null;

  const content = await deepseekChatCompletion({
    messages: [
      {
        role: "user",
        content:
          `Translate the following text from ${languageName(from)} to ${languageName(to)}.\n` +
          `Return only the translation, no quotes or commentary.\n\n` +
          trimmed,
      },
    ],
    temperature: 0.2,
  });

  return content?.trim() || null;
}

export async function translateTitleBody(
  title: string,
  body: string,
  from: PublishLocale,
  to: PublishLocale,
): Promise<{ title: string; body: string } | null> {
  const titleTrimmed = title.trim();
  const bodyTrimmed = body.trim();
  if (!titleTrimmed) return null;
  if (from === to) {
    return { title: titleTrimmed, body: bodyTrimmed };
  }
  if (!isTranslationEnabled()) return null;

  const hasBody = bodyTrimmed.length > 0;
  const content = await deepseekChatCompletion({
    jsonMode: true,
    messages: [
      {
        role: "user",
        content:
          `Translate from ${languageName(from)} to ${languageName(to)}.\n` +
          `Return JSON: {"title": "...", "body": "..."}.\n` +
          (hasBody
            ? `Translate both title and body.\n\n`
            : `Body is empty — return {"title": "...", "body": ""}.\n\n`) +
          `Title:\n${titleTrimmed}\n\n` +
          (hasBody ? `Body:\n${bodyTrimmed}` : "Body: (empty)"),
      },
    ],
    temperature: 0.2,
  });

  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { title?: string; body?: string };
    const translatedTitle = parsed.title?.trim();
    if (!translatedTitle) {
      logger.warn({ content: content.slice(0, 200) }, "DeepSeek title/body JSON missing title");
      return null;
    }
    return {
      title: translatedTitle,
      body: hasBody ? (parsed.body?.trim() ?? "") : "",
    };
  } catch (error) {
    logger.error({ error, content: content.slice(0, 200) }, "Failed to parse DeepSeek title/body JSON");
    return null;
  }
}
