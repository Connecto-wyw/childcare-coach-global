// src/app/kyk/loading/page.tsx
import { getDictionary } from '@/i18n'
import LoadingClient from './LoadingClient'

export default async function KYKLoadingPage() {
  const t = await getDictionary('kyk')
  
  return <LoadingClient dict={t} />
}
