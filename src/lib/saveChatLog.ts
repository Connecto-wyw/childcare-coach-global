import { supabase } from './supabaseClient'


export async function saveChatLog(question: string, answer: string) {
  const { error } = await supabase.from('chat_logs').insert([{ question, answer }])

  if (error) {
    console.error('❌ Supabase 저장 실패:', JSON.stringify(error, null, 2))
  } else {
    console.log('✅ Supabase 저장 성공')
  }
}
