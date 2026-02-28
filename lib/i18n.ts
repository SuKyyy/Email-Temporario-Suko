import enDict from "@/dictionaries/en.json"
import ptDict from "@/dictionaries/pt.json"
import ruDict from "@/dictionaries/ru.json"
import esDict from "@/dictionaries/es.json"
import jaDict from "@/dictionaries/ja.json"
import zhDict from "@/dictionaries/zh.json"
import deDict from "@/dictionaries/de.json"
import frDict from "@/dictionaries/fr.json"
import trDict from "@/dictionaries/tr.json"
import koDict from "@/dictionaries/ko.json"

export const locales = ["en", "pt", "ru", "es", "ja", "zh", "de", "fr", "tr", "ko"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export type Dictionary = typeof enDict

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

const dictionaries: Record<string, Dictionary> = {
  en: enDict,
  pt: ptDict,
  ru: ruDict,
  es: esDict,
  ja: jaDict,
  zh: zhDict,
  de: deDict,
  fr: frDict,
  tr: trDict,
  ko: koDict,
}

export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? dictionaries.en
}

/** Map Vercel geo country codes to our supported locales */
export function countryToLocale(country: string): Locale {
  const map: Record<string, Locale> = {
    BR: "pt", PT: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", TL: "pt", ST: "pt",
    RU: "ru", BY: "ru", KZ: "ru", KG: "ru", TJ: "ru",
    ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
    JP: "ja",
    CN: "zh", TW: "zh", HK: "zh", SG: "zh",
    DE: "de", AT: "de", CH: "de",
    FR: "fr", BE: "fr", CA: "fr", SN: "fr", CI: "fr",
    TR: "tr", CY: "tr",
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
