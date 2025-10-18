import { en } from "./en.ts";
import { ru } from "./ru.ts";

export type Locale = typeof ru;
export type LocaleKey = keyof Locale;

export const locales = {
  ru,
  en,
} as const;

export type SupportedLanguage = keyof typeof locales;

export function getLocale(language: string): Locale {
  return locales[language as SupportedLanguage] as Locale || locales.ru;
}

export function isSupportedLanguage(
  language: string,
): language is SupportedLanguage {
  return language in locales;
}
