/**
 * Normalizes locales safely to one of the 5 base keys.
 * e.g., 'en-US' -> 'en', 'ko-KR' -> 'ko', 'ms-MY' -> 'ms'
 */
export function normalizeLocale(locale?: string | null): string {
  if (!locale) return 'en'
  const lower = locale.toLowerCase()
  if (lower.startsWith('ko')) return 'ko' // Korean
  if (lower.startsWith('id')) return 'id' // Indonesian
  if (lower.startsWith('ms')) return 'ms' // Malay 
  if (lower.startsWith('th')) return 'th' // Thai
  return 'en' // English fallback
}

/**
 * Resolves standard _i18n JSONB data.
 * Chain of fallback: JSONB[locale] -> JSONB['en'] -> baseString
 * Note: existing base string should always map to EN according to data sync rules.
 */
export function resolveI18n(baseString: string | null | undefined, i18nJsonb: any, inputLocale: string): string {
  const safeBase = baseString || ''
  const locale = normalizeLocale(inputLocale)

  if (i18nJsonb && typeof i18nJsonb === 'object') {
    // 1. Target Locale
    const val = i18nJsonb[locale]
    if (val && typeof val === 'string' && val.trim() !== '') {
      return val
    }
    // 2. English Fallback in JSONB
    const enVal = i18nJsonb['en']
    if (enVal && typeof enVal === 'string' && enVal.trim() !== '') {
      return enVal
    }
  }

  // 3. Absolute Base String Fallback
  return safeBase
}
