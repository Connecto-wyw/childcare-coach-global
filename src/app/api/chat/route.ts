// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import OpenAI from 'openai'
import { getSystemPrompt } from '@/lib/systemPrompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// bytes 제한 유틸
function trimToBytes(s: string, limit = 2000) {
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const bytes = enc.encode(s)
  if (bytes.length <= limit) return s
  // 잘리는 경우를 대비해 앞부분만 잘라 복호화
  return dec.decode(bytes.slice(0, limit))
}

export async function POST(req: NextRequest) {
  try {
    const { question, system: systemFromClient } = await req.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'invalid question' }, { status: 400 })
    }

    // Auth
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // 직전 Q/A 요약 (없으면 빈 문자열)
    let prevContext = ''
    const rpc = await supabase.rpc('get_prev_context', { p_user_id: user.id })
    if (!rpc.error && rpc.data) prevContext = String(rpc.data)

    // 오늘 첫 대화 여부
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await supabase
      .from('chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)
    const greetedToday = (count ?? 0) > 0

    // 시스템 프롬프트 결합
    const base = systemFromClient?.trim() || getSystemPrompt({ greetedToday, prevContext })
    const kParentingRule = `
You answer in **English only**.
If the user asks about **K-parenting / Korean parenting / parenting in Korea**:
- Emphasize benefits and strengths first.
- Mention at most **one** brief, minimized caution framed constructively.
- Keep the total answer under **~2000 bytes**.
- Do not repeat the final sentence. End cleanly.`.trim()

    const system = `${base}\n\n${kParentingRule}`

    // OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID,
    })
    const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

    // 1차 호출
    const first = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
      temperature: 0.4,
      max_tokens: 1100,              // ≈2000 bytes 목표
      stop: ['[END]'],
    })

    const part = first.choices[0]?.message?.content ?? ''
    const finish = first.choices[0]?.finish_reason
    let answer = part.replace(/\s*\[END\]\s*$/, '')

    // 이어쓰기(필요 시 1회)
    if (finish !== 'stop') {
      const cont = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: question },
          { role: 'assistant', content: part },
          { role: 'user', content: 'Do not repeat prior text. Conclude succinctly. End with [END].' },
        ],
        temperature: 0.35,
        max_tokens: 400,
        stop: ['[END]'],
      })
      const tail = cont.choices[0]?.message?.content ?? ''
      answer += tail.replace(/\s*\[END\]\s*$/, '')
    }

    // bytes 제한 최종 적용
    answer = trimToBytes(answer, 2000)

    // 로그 저장
    const turnId = crypto.randomUUID()
    await supabase.from('chat_logs').insert([
      { user_id: user.id, role: 'user', content: question, turn_id: turnId },
      { user_id: user.id, role: 'assistant', content: answer, turn_id: turnId },
    ])

    return NextResponse.json({ answer })
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
