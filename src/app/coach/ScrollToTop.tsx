'use client'

import { useEffect } from 'react'

export default function ScrollToTop() {
  useEffect(() => {
    // 페이지 진입 시 무조건 top
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return null
}
