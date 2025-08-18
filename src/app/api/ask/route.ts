import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const key = (ip: string) => `${new Date().toISOString().slice(0,10)}:${ip}`

export async function POST(req: Request) {
  const { user_id, question } = await req.json()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'

  if (!user_id) {
    const k = key(ip)
    const used = guestMap.get(k) ?? 0
    if (used >= GUEST_LIMIT) {
      return NextResponse.json({ error: 'guest_limit_exceeded', message: '게스트는 하루 2회까지 질문 가능합니다.' }, { status: 403 })
    }
    guestMap.set(k, used + 1)
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const answer = `임시 응답: "${question}"에 대한 답변.`

  await supabase.from('chat_logs').insert({ user_id: user_id ?? null, question, answer })
  return NextResponse.json({ answer })
}
