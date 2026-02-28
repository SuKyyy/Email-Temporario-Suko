export const locales = ["en", "pt", "ru", "es", "ja", "zh", "de", "fr", "tr", "ko"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

/** Map Vercel geo country codes to our supported locales */
export function countryToLocale(country: string): Locale {
  const map: Record<string, Locale> = {
    // Portuguese
    BR: "pt",
    PT: "pt",
    AO: "pt",
    MZ: "pt",
    CV: "pt",
    GW: "pt",
    TL: "pt",
    ST: "pt",
    // Russian
    RU: "ru",
    BY: "ru",
    KZ: "ru",
    KG: "ru",
    TJ: "ru",
    // Spanish
    ES: "es",
    MX: "es",
    AR: "es",
    CO: "es",
    CL: "es",
    PE: "es",
    VE: "es",
    EC: "es",
    // Japanese
    JP: "ja",
    // Chinese
    CN: "zh",
    TW: "zh",
    HK: "zh",
    SG: "zh",
    // German
    DE: "de",
    AT: "de",
    CH: "de",
    // French
    FR: "fr",
    BE: "fr",
    CA: "fr",
    SN: "fr",
    CI: "fr",
    // Turkish
    TR: "tr",
    CY: "tr",
    // Korean
    KR: "ko",
  }
  return map[country.toUpperCase()] ?? "en"
}

/** Parse Accept-Language header to find best matching locale */
export function acceptLanguageToLocale(header: string): Locale {
  const segments = header.split(",").map((s) => s.trim().split(";")[0].trim().toLowerCase())
  for (const seg of segments) {
    if (seg.startsWith("pt")) return "pt"
    if (seg.startsWith("ru")) return "ru"
    if (seg.startsWith("es")) return "es"
    if (seg.startsWith("ja")) return "ja"
    if (seg.startsWith("zh")) return "zh"
    if (seg.startsWith("de")) return "de"
    if (seg.startsWith("fr")) return "fr"
    if (seg.startsWith("tr")) return "tr"
    if (seg.startsWith("ko")) return "ko"
    if (seg.startsWith("en")) return "en"
  }
  return defaultLocale
}

const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  pt: () => import("@/dictionaries/pt.json").then((m) => m.default),
  ru: () => import("@/dictionaries/ru.json").then((m) => m.default),
  es: () => import("@/dictionaries/es.json").then((m) => m.default),
  ja: () => import("@/dictionaries/ja.json").then((m) => m.default),
  zh: () => import("@/dictionaries/zh.json").then((m) => m.default),
  de: () => import("@/dictionaries/de.json").then((m) => m.default),
  fr: () => import("@/dictionaries/fr.json").then((m) => m.default),
  tr: () => import("@/dictionaries/tr.json").then((m) => m.default),
  ko: () => import("@/dictionaries/ko.json").then((m) => m.default),
}

export async function getDictionary(locale: string) {
  const loader = dictionaries[locale as Locale]
  if (!loader) return dictionaries.en()
  return loader()
}

/** Full BCP-47 lang tag for the <html> element */
export function localeToHtmlLang(locale: string): string {
  const map: Record<string, string> = {
    en: "en",
    pt: "pt-BR",
    ru: "ru",
    es: "es",
    ja: "ja",
    zh: "zh-CN",
    de: "de",
    fr: "fr",
    tr: "tr",
    ko: "ko",
  }
  return map[locale] ?? "en"
}

// Export the dictionary type derived from getDictionary's return value
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
