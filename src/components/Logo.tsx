// src/components/Logo.tsx
import Image from 'next/image'

type Props = { locale?: string }

export default function Logo({ locale = 'en' }: Props) {
  if (locale === 'ko') {
    return (
      <div className="flex justify-center">
        <Image
          src="/logo.png"
          alt="인디언밥"
          width={138}
          height={60}
          priority
        />
      </div>
    )
  }

  // Non-KO: TEAM UP wordmark
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-2 select-none">
        {/* 아이콘 */}
        <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none" aria-hidden="true">
          <circle cx="18" cy="18" r="18" fill="#0e0e0e" />
          <circle cx="12" cy="14" r="4" fill="white" />
          <circle cx="24" cy="14" r="4" fill="white" />
          <path d="M5 28c0-4.418 3.134-8 7-8h12c3.866 0 7 3.582 7 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
        {/* 텍스트 */}
        <span className="text-[22px] font-extrabold tracking-tight text-[#0e0e0e] leading-none">
          TEAM<span className="text-[#3497f3]"> UP</span>
        </span>
      </div>
    </div>
  )
}
