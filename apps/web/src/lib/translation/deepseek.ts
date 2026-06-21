import { logger } from "@/lib/logger";
import { TRANSLATION_SYSTEM_PROMPT } from "@/lib/translation/glossary";

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 45_000;

export function isTranslationEnabled(): boolean {
  if (process.env.TRANSLATION_ENABLED === "false") return false;
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export async function deepseekChatCompletion(options: {
  messages: DeepSeekMessage[];
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    logger.warn("DeepSeek translation skipped: DEEPSEEK_API_KEY is not set");
    return null;
  }

  const baseUrl = (process.env.DEEPSEEK_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
  const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: TRANSLATION_SYSTEM_PROMPT }, ...options.messages],
        temperature: options.temperature ?? 0.2,
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body: errText.slice(0, 500) },
        "DeepSeek API request failed",
      );
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      logger.warn("DeepSeek API returned empty content");
      return null;
    }
    return content;
  } catch (error) {
    logger.error({ error }, "DeepSeek API call failed");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
