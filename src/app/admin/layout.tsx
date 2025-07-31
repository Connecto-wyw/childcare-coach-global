import '../../../globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '../../globals.css'  // app/globals.css 경로에 맞게 조정
import { Providers } from '@/app/providers'  // Providers 경로 확인 필요

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI 육아코치 - Admin',
  description: '관리자 페이지',
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
