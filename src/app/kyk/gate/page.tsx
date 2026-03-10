// src/app/kyk/gate/page.tsx
import { getDictionary } from '@/i18n'
import GateClient from './GateClient'

export default async function KYKGatePage() {
  const t = await getDictionary('kyk')
  
  return <GateClient dict={t.gate} />
}