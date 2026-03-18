import { cookies } from 'next/headers'

export type Locale = 'en' | 'ko' | 'th' | 'ms' | 'id'

export const defaultLocale: Locale = 'en'
export const locales: Locale[] = ['en', 'ko', 'th', 'ms', 'id']

export const COOKIE_NAME = 'NEXT_LOCALE'

function getDictionaryLoader(locale: Locale) {
  switch (locale) {
    case 'ko':
      return () => import('./messages/ko/index')
    case 'th':
      return () => import('./messages/th/index')
    case 'ms':
      return () => import('./messages/ms/index')
    case 'id':
      return () => import('./messages/id/index')
    case 'en':
    default:
      return () => import('./messages/en/index')
  }
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get(COOKIE_NAME)?.value

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale
  }

  return defaultLocale
}

export async function getDictionary(namespace: 'navbar' | 'about' | 'coach' | 'news' | 'team' | 'common' | 'kyk'): Promise<any> {
  const locale = await getLocale()

  try {
    const loader = getDictionaryLoader(locale)
    const dict = await loader()
    return dict[namespace]
  } catch (error) {
    console.error(`Failed to load dictionary for locale ${locale} and namespace ${namespace}`, error)
    const fallbackLoader = getDictionaryLoader(defaultLocale)
    const fallbackDict = await fallbackLoader()
    return fallbackDict[namespace]
  }
}

