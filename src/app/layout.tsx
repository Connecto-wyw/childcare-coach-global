// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import NavBar from '@/components/layout/NavBar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-[#0e0e0e] antialiased font-sans">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
