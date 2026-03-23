// src/components/Logo.tsx
import Image from 'next/image'

type Props = { locale?: string }

export default function Logo({ locale = 'en' }: Props) {
  if (locale === 'ko') {
    return (
      <div className="flex justify-center">
        <Image
          src="/logo-indianbob.png"
          alt="인디언밥"
          width={138}
          height={60}
          priority
        />
      </div>
    )
  }

  // Non-KO: TEAM UP logo
  return (
    <div className="flex justify-center">
      <Image
        src="/logo.png"
        alt="TEAM UP"
        width={138}
        height={60}
        priority
      />
    </div>
  )
}
