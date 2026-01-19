// src/components/Logo.tsx
import Image from 'next/image'

export default function Logo() {
  return (
    <div className="flex justify-center">
      <Image
        src="/logo.png"
        alt="Logo"
        width={60}
        height={60}
        priority
      />
    </div>
  )
}
