import { supabase } from './supabaseClient'

export async function saveChatLog({
  question,
  answer,
  sessionId,
}: {
  question: string
  answer: string
  sessionId?: string
}) {
  const { data, error } = await supabase.from('logs').insert([
    {
      question,
      answer,
      session_id: sessionId || '',
    },
  ])

  if (error) {
    console.error('❌ 저장 오류:', error.message)
  }

  return { data, error }
}
