import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import NavBar from '@/components/layout/NavBar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.indianbob.ai'),   // ✅ 절대 경로 base 지정
  title: 'AI Parenting Coach',
  description: 'A personalized AI Parenting Coach for parents',
  openGraph: {
    title: 'AI Parenting Coach',
    description: 'A personalized AI Parenting Coach for parents',
    url: 'https://childcare-coach-global.vercel.app/coach',
    siteName: 'AI Parenting Coach',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'AI 육아코치 썸네일' },
    ],
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
    icon: '/favicon.ico',                 
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#333333] text-[#eae3de] min-h-screen`}>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
