import { NextRequest, NextResponse } from "next/server"
import {
  locales,
  defaultLocale,
  isValidLocale,
  countryToLocale,
  acceptLanguageToLocale,
} from "@/lib/i18n"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the pathname already starts with a supported locale
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameLocale) {
    // Path already has a locale — set a cookie so the root layout can read it
    const response = NextResponse.next()
    response.cookies.set("NEXT_LOCALE", pathnameLocale, { path: "/" })
    return response
  }

  // Detect the best locale for this visitor
  let detectedLocale = defaultLocale

  // 1. Try Vercel geolocation header
  const country = request.headers.get("x-vercel-ip-country")
  if (country) {
    detectedLocale = countryToLocale(country)
  } else {
    // 2. Fall back to Accept-Language header
    const acceptLang = request.headers.get("accept-language")
    if (acceptLang) {
      detectedLocale = acceptLanguageToLocale(acceptLang)
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
     * Match all paths except:
     * - /api (API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt, /sitemap.xml
     * - Static file extensions (.png, .jpg, .svg, .css, .js, etc.)
     */
    "/((?!api|admin|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
}
