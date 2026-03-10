import { getDictionary } from '@/i18n'
import Step1Client from './Step1Client'

export const dynamic = 'force-dynamic'

export default async function KYKStep1Page() {
  const dictionary = await getDictionary('kyk')

  return <Step1Client dict={{ ...dictionary.step1, adjectives: dictionary.adjectives }} />
}