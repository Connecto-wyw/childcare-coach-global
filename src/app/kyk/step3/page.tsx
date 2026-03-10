import { Suspense } from 'react'
import { getDictionary } from '@/i18n'
import Step3Client from './Step3Client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function KYKStep3Page() {
  const dictionary = await getDictionary('kyk')

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Step3Client dict={{ ...dictionary.step3, likert: dictionary.likert, questions: dictionary.questions }} />
    </Suspense>
  )
}