import type { Metadata } from 'next'
import { Inter, Kanit } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import NavBar from '@/components/layout/NavBar'
import { getLocale, getDictionary } from '@/i18n'
import { I18nProvider } from '@/i18n/I18nProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-kanit',
  display: 'swap',
})

// We use a CSS variable for Pretendard defined in globals.css
// because next/font/local has issues with certain variable fonts in Turbopack
const pretendardVariable = '--font-pretendard'

export const metadata: Metadata = {
  metadataBase: new URL('https://childcare-coach-global.vercel.app'),
  title: 'AI Parenting Coach',
  description: 'A personalized AI Parenting Coach for parents',
  openGraph: {
    title: 'AI Parenting Coach',
    description: 'A personalized AI Parenting Coach for parents',
    url: '/coach',
    siteName: 'AI Parenting Coach',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AI 육아코치 썸네일' }],
    locale: 'ko_KR',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'AI Parenting Coach',
    description: 'A personalized AI Parenting Coach for parents',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.png' }],
    shortcut: ['/favicon.ico'],
    apple: ['/apple-touch-icon.png'],
  },
  alternates: {
    canonical: '/coach',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  
  // Load common dictionaries required by Layout/Client components
  const navbarDict = await getDictionary('navbar')
  
  const dictionaries = {
    navbar: navbarDict,
  }

  // Determine font variable based on locale
  let fontVariable = inter.variable
  if (locale === 'ko') {
    fontVariable = pretendardVariable
  } else if (locale === 'th') {
    fontVariable = kanit.variable
  }

  return (
    <html lang={locale} className={`${fontVariable} ${inter.variable} ${pretendardVariable} ${kanit.variable}`}>
      <body className={`min-h-screen bg-white text-[#0e0e0e] antialiased font-sans flex flex-col`}>
        <I18nProvider locale={locale} dictionary={dictionaries}>
          <Providers>
            <NavBar />
            {children}
          </Providers>
        </I18nProvider>
      </body>
    </html>
  )
}
