import { supabase } from './supabaseClient'


export async function saveChatLog(
  question: string,
  answer: string,
  userId: string | null = null
) {
  const { error } = await supabase.from('chat_logs').insert({
    question,
    answer,
    user_id: userId,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('❌ Supabase 저장 오류:', error.message)
  }
}
