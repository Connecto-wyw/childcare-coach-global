// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import OpenAI from 'openai'
import { getSystemPrompt } from '@/lib/systemPrompt'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'invalid question' }, { status: 400 })
    }

    // Auth
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // 직전 Q/A 요약 (RPC 없으면 빈 문자열)
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

    // 시스템 프롬프트
    const system = getSystemPrompt({ greetedToday, prevContext })

    // OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID,
    })
    const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-mini'

    // 1차 호출
    const first = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
      temperature: 0.5,
      max_tokens: 900,
      stop: ['[END]'],
    })

    const part = first.choices[0]?.message?.content ?? ''   // ← const로 수정
    const finish = first.choices[0]?.finish_reason
    let answer = part.replace(/\s*\[END\]\s*$/, '')

    // 이어쓰기(필요 시)
    if (finish !== 'stop') {
      const cont = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: question },
          { role: 'assistant', content: part },
          { role: 'user', content: '방금 답변이 끊겼다. 마지막 문장부터 자연스럽게 마무리하고, 끝에 [END]로 종료하라.' },
        ],
        temperature: 0.4,
        max_tokens: 300,
        stop: ['[END]'],
      })
      const tail = cont.choices[0]?.message?.content ?? ''
      answer += tail.replace(/\s*\[END\]\s*$/, '')
    }

    // 로그 저장
    const turnId = crypto.randomUUID()
    await supabase.from('chat_logs').insert([
      { user_id: user.id, role: 'user', content: question, turn_id: turnId },
      { user_id: user.id, role: 'assistant', content: answer, turn_id: turnId },
    ])

    return NextResponse.json({ answer })
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
