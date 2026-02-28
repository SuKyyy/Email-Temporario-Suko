import { NextRequest, NextResponse } from "next/server"

const LOCALES = ["en", "pt", "ru", "es", "ja", "zh", "de", "fr", "tr", "ko"]
const DEFAULT_LOCALE = "en"

const COUNTRY_MAP: Record<string, string> = {
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
  RU: "ru", BY: "ru", KZ: "ru",
  ES: "es", MX: "es", AR: "es", CO: "es",
  JP: "ja",
  CN: "zh", TW: "zh", HK: "zh",
  DE: "de", AT: "de", CH: "de",
  FR: "fr", BE: "fr", CA: "fr",
  TR: "tr",
  KR: "ko",
}

function getLocale(request: NextRequest): string {
  const country = request.headers.get("x-vercel-ip-country")
  if (country && COUNTRY_MAP[country.toUpperCase()]) {
    return COUNTRY_MAP[country.toUpperCase()]
  }
  const acceptLang = request.headers.get("accept-language") ?? ""
  const segments = acceptLang.split(",").map((s) => s.trim().split(";")[0].trim().toLowerCase())
  for (const seg of segments) {
    for (const locale of LOCALES) {
      if (seg === locale || seg.startsWith(locale + "-")) return locale
    }
  }
  return DEFAULT_LOCALE
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if path already has a valid locale prefix
  const segments = pathname.split("/")
  const firstSegment = segments[1]

  if (firstSegment && LOCALES.includes(firstSegment)) {
    const response = NextResponse.next()
    response.cookies.set("NEXT_LOCALE", firstSegment, { path: "/" })
    return response
  }

  // No locale in path — redirect to detected locale
  const locale = getLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname}`
  const response = NextResponse.redirect(url)
  response.cookies.set("NEXT_LOCALE", locale, { path: "/" })
  return response
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
