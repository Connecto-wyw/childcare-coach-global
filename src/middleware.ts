import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, COOKIE_NAME, Locale } from './i18n'

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl
  
  // We want to skip handling API, static files, and Next.js internal paths
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 1. Try to read from cookie FIRST (Single Source of Truth)
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value

  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    // If it's valid, let the request pass through. Server Components will read this same cookie.
    return NextResponse.next()
  }

  // 2. Fallback to Accept-Language negotiation if no cookie is present
  const acceptLanguage = request.headers.get('accept-language')
  let detectedLocale: Locale = defaultLocale

  if (acceptLanguage) {
    // Simple parser for Accept-Language to get the primary preferred language code
    // E.g., "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" -> we split by comma and parse the first entry
    const preferredLanguages = acceptLanguage.split(',').map(lang => {
      const parts = lang.split(';')
      return parts[0].trim().toLowerCase()
    })

    // Match the preferred languages against our supported locales
    for (const lang of preferredLanguages) {
      if (lang.startsWith('ko')) {
        detectedLocale = 'ko'
        break
      } else if (lang.startsWith('th')) {
        detectedLocale = 'th'
        break
      } else if (lang.startsWith('ms')) {
        detectedLocale = 'ms'
        break
      } else if (lang.startsWith('id')) {
        detectedLocale = 'id'
        break
      } else if (lang.startsWith('en')) {
        detectedLocale = 'en'
        break
      }
    }
  }

  // 3. Set the detected locale in a cookie for future visits
  const response = NextResponse.next()
  response.cookies.set(COOKIE_NAME, detectedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  return response
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
