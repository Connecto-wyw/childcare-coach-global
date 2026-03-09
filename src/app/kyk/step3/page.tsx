// src/app/kyk/step3/page.tsx
import { Suspense } from 'react'
import Step3Client from './Step3Client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function KYKStep3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Step3Client />
    </Suspense>
  )
}