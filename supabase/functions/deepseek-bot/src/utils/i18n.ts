import {
  getLocale,
  type Locale,
  type LocaleKey,
  type SupportedLanguage,
} from "../locales/index.ts";

export class I18n {
  private locale: Locale;
  private language: SupportedLanguage;

  constructor(language: string = "ru") {
    this.language = (language as SupportedLanguage) || "ru";
    this.locale = getLocale(this.language);
  }

  /**
   * Получить переведенный текст по ключу
   */
  t(key: LocaleKey, params?: Record<string, string | number>): string {
    let text = this.locale[key] as string;

    if (!text) {
      console.warn(
        `Translation key "${key}" not found for language "${this.language}"`,
      );
      return key;
    }

    // Заменяем параметры в тексте
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(
          new RegExp(`{${paramKey}}`, "g"),
          String(paramValue),
        );
      }
    }

    return text;
  }

  /**
   * Получить текущий язык
   */
  getLanguage(): SupportedLanguage {
    return this.language;
  }

  /**
   * Установить новый язык
   */
  setLanguage(language: string): void {
    this.language = (language as SupportedLanguage) || "ru";
    this.locale = getLocale(this.language);
  }

  /**
   * Проверить, поддерживается ли язык
   */
  isLanguageSupported(language: string): boolean {
    return language in getLocale("ru");
  }

  /**
   * Получить список поддерживаемых языков
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(getLocale("ru")) as SupportedLanguage[];
  }
}

/**
 * Создать экземпляр I18n для пользователя
 */
export function createI18n(language: string = "ru"): I18n {
  return new I18n(language);
}

/**
 * Форматировать дату в соответствии с локалью
 */
export function formatDate(date: Date, language: string = "ru"): string {
  const locale = language === "en" ? "en-US" : "ru-RU";
  return date.toLocaleDateString(locale);
}

/**
 * Форматировать число в соответствии с локалью
 */
export function formatNumber(number: number, language: string = "ru"): string {
  const locale = language === "en" ? "en-US" : "ru-RU";
  return number.toLocaleString(locale);
}
