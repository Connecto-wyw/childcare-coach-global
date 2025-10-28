// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import NavBar from '@/components/layout/NavBar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://indianbob.ai'),
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
