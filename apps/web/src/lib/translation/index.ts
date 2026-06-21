export { deepseekChatCompletion, isTranslationEnabled } from "@/lib/translation/deepseek";
export { TRANSLATION_SYSTEM_PROMPT } from "@/lib/translation/glossary";
export {
  syncLocalizedDescription,
  syncLocalizedLabel,
  syncLocalizedTitleBody,
  type LocalizedDescriptionFields,
  type LocalizedTitleBodyFields,
} from "@/lib/translation/sync-localized";
export {
  syncLocalizedClubTextFields,
  syncLocalizedPriceTiers,
  buildClubLocalizedUpdate,
  clubLocalizedToPrisma,
  type ClubLocalizedTextFields,
} from "@/lib/translation/sync-localized-club";
export { translateText, translateTitleBody } from "@/lib/translation/translate";
export type { PublishLocale } from "@/lib/translation/types";
