export const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "it", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const RTL_LOCALES = new Set<Locale>(["ar"]);

export const LOCALE_LABELS: Record<Locale, { name: string; flag: string }> = {
  fr: { name: "Français", flag: "🇫🇷" },
  en: { name: "English", flag: "🇬🇧" },
  es: { name: "Español", flag: "🇪🇸" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  it: { name: "Italiano", flag: "🇮🇹" },
  ar: { name: "العربية", flag: "🇸🇦" },
};
