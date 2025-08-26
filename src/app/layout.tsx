import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import NavBar from '@/components/layout/NavBar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI 육아코치',
  description: '부모를 위한 맞춤형 AI 육아 코치',
  openGraph: {
    title: 'AI 육아코치',
    description: '부모를 위한 맞춤형 AI 육아 코치',
    url: 'https://www.indianbob.ai',
    siteName: 'AI 육아코치',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'AI 육아코치 썸네일' },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 육아코치',
    description: '부모를 위한 맞춤형 AI 육아 코치',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',                 // <- public/favicon.ico
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',      // <- public/apple-touch-icon.png (선택)
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
