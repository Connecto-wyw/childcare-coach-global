import { getDictionary } from '@/i18n'
import Step2Client from './Step2Client'

export const dynamic = 'force-dynamic'

export default async function KYKStep2Page() {
  const dictionary = await getDictionary('kyk')

  return <Step2Client dict={{ ...dictionary.step2, likert: dictionary.likert, questions: dictionary.questions }} />
}