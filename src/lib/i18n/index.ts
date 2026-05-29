import en from "./dictionaries/en.json";
import mm from "./dictionaries/mm.json";

export type Locale = "en" | "mm";
export type Dictionary = typeof en;

export const LOCALE_COOKIE = "novelbase-locale";
export const DEFAULT_LOCALE: Locale = "mm";
export const LOCALES: Locale[] = ["en", "mm"];

const dictionaries: Record<Locale, Dictionary> = { en, mm };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
