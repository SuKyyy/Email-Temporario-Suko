export const locales = ["en", "pt", "ru", "es", "ja", "zh", "de", "fr", "tr", "ko"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

const htmlLangMap: Record<string, string> = {
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

export function localeToHtmlLang(locale: string): string {
  return htmlLangMap[locale] ?? "en"
}

export type Dictionary = {
  header: { brand: string; selectLanguage: string; supplier_prices: string }
  hero: { title: string; subtitle: string }
  emailInput: {
    heading: string; description: string; placeholder: string; ariaLabel: string
    copyAriaLabel: string; accessAriaLabel: string; loading: string; submit: string
    copiedToast: string; copyErrorToast: string
  }
  inbox: {
    title: string; checking: string; updatesIn: string; seconds: string
    refreshAriaLabel: string; refreshing: string; refresh: string; warning: string
    searching: string; attachment: string; attachments: string; noEmailsFound: string
    noEmailSelected: string; emptyInbox: string; enterEmailPrompt: string
  }
  notifications: {
    newEmailBrowser: string; from: string; newEmailToastOne: string; newEmailToastMany: string
  }
  errors: {
    invalidFormat: string; noUsername: string; unsupportedDomain: string
    fetchError: string; genericError: string; updateError: string
  }
  status: { inboxUpdated: string; checkingNewEmails: string }
  footer: { text: string }
  metadata: { title: string; description: string }
}

export async function getDictionary(locale: string): Promise<Dictionary> {
  try {
    const dict = await import(`@/dictionaries/${locale}.json`)
    return dict.default as Dictionary
  } catch {
    const dict = await import(`@/dictionaries/en.json`)
    return dict.default as Dictionary
  }
}
