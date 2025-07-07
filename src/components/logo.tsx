'use client'

import Image from 'next/image'
import logo from '@/assets/logo.png'

export default function Logo() {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Image src={logo} alt="인디언밥 로고" width={120} height={60} />
    </div>
  )
}
