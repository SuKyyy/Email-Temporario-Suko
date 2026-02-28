import { NextRequest, NextResponse } from "next/server"

const LOCALES = ["en", "pt", "ru", "es", "ja", "zh", "de", "fr", "tr", "ko"]
const DEFAULT_LOCALE = "en"

/** Map Vercel geo country codes to our supported locales */
const COUNTRY_MAP: Record<string, string> = {
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

function getLocaleFromAcceptLanguage(header: string): string {
  const segments = header.split(",").map((s) => s.trim().split(";")[0].trim().toLowerCase())
  for (const seg of segments) {
    for (const locale of LOCALES) {
      if (seg.startsWith(locale)) return locale
    }
  }
  return DEFAULT_LOCALE
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes and static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check if the pathname already starts with a supported locale
  const segments = pathname.split("/")
  const firstSegment = segments[1] // e.g. "en" from "/en" or "/en/foo"

  if (LOCALES.includes(firstSegment)) {
    // Path already has a locale — set a cookie so the root layout can read it
    const response = NextResponse.next()
    response.cookies.set("NEXT_LOCALE", firstSegment, { path: "/" })
    return response
  }

  // Detect the best locale for this visitor
  let detectedLocale = DEFAULT_LOCALE

  // 1. Try Vercel geolocation header
  const country = request.headers.get("x-vercel-ip-country")
  if (country) {
    detectedLocale = COUNTRY_MAP[country.toUpperCase()] ?? DEFAULT_LOCALE
  } else {
    // 2. Fall back to Accept-Language header
    const acceptLang = request.headers.get("accept-language")
    if (acceptLang) {
      detectedLocale = getLocaleFromAcceptLanguage(acceptLang)
    }
  }

  // Redirect to the locale-prefixed path
  const url = request.nextUrl.clone()
  url.pathname = `/${detectedLocale}${pathname}`
  const response = NextResponse.redirect(url)
  response.cookies.set("NEXT_LOCALE", detectedLocale, { path: "/" })
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next (static files, images)
     * - favicon.ico, robots.txt, sitemap.xml
     * - files with extensions (e.g. .png, .css, .js)
     */
    "/((?!api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
}
