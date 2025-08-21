// src/app/api/ask/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getSystemPrompt } from '@/lib/systemPrompt'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const keyOf = (ip: string) => `${new Date().toISOString().slice(0, 10)}:${ip}`

type AskBody = { user_id?: string; question?: string }
type Choice = { message?: { content?: string }, finish_reason?: string }

export async function POST(req: Request) {
  const { user_id, question }: AskBody = await req.json()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'

  if (!question?.trim()) {
    return NextResponse.json({ error: 'bad_request', message: '질문이 비어 있습니다.' }, { status: 400 })
  }

  // 게스트 1일 2회 제한만 유지
  if (!user_id) {
    const k = keyOf(ip)
    const used = guestMap.get(k) ?? 0
    if (used >= GUEST_LIMIT) {
      return NextResponse.json(
        { error: 'guest_limit_exceeded', message: '게스트는 하루 2회까지 질문 가능합니다.' },
        { status: 403 }
      )
    }
    guestMap.set(k, used + 1)
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'config', message: 'OPENAI_API_KEY 누락' }, { status: 500 })
  }
  const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-mini'

  // 오늘 인사 여부
  const jar = await cookies()
  const today = new Date().toISOString().slice(0, 10)
  const greetedToday = jar.get('coach_last_greet')?.value === today

  const systemPrompt = getSystemPrompt({ greetedToday })

  // OpenAI 1차 호출
  let answer = ''
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 45000)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    }
    if (process.env.OPENAI_ORG_ID) headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID!
    if (process.env.OPENAI_PROJECT_ID) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID!

    const first = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.35,
        max_tokens: 900,                  // 제한 해제: 여유 있게
        stop: ['[END]'],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      }),
      cache: 'no-store',
      signal: ac.signal,
    })
    clearTimeout(timer)

    if (!first.ok) {
      const reqId = first.headers.get('x-request-id') || first.headers.get('openai-request-id') || ''
      const bodyText = await first.text().catch(() => '')
      return NextResponse.json(
        { error: 'upstream', status: first.status, request_id: reqId, body: bodyText.slice(0, 2000) },
        { status: first.status }
      )
    }

    const data: { choices?: Choice[] } = await first.json()
    const c1 = data.choices?.[0]
    const part = c1?.message?.content ?? ''
    const finish = c1?.finish_reason
    answer = part.replace(/\s*\[END\]\s*$/, '')

    // 이어쓰기 1회만
    if (finish && finish !== 'stop') {
      const cont = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.35,
          max_tokens: 600,                // 이어쓰기 여유
          stop: ['[END]'],
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
            { role: 'assistant', content: part },
            { role: 'user', content: '방금 답변이 끊겼다. 마지막 문장부터 자연스럽게 마무리하고, 끝에 [END]로 종료하라.' },
          ],
        }),
        cache: 'no-store',
      })
      if (!cont.ok) {
        const t = await cont.text().catch(() => '')
        return NextResponse.json(
          { error: 'upstream_cont', status: cont.status, body: t.slice(0, 2000) },
          { status: cont.status }
        )
      }
      const contData: { choices?: Choice[] } = await cont.json()
      const tail = contData.choices?.[0]?.message?.content ?? ''
      answer += tail.replace(/\s*\[END\]\s*$/, '')
    }
  } catch (e: unknown) {
    const isAbort = e instanceof Error && e.name === 'AbortError'
    return NextResponse.json(
      { error: 'exception', message: isAbort ? '응답 지연으로 중단되었습니다.' : String(e) },
      { status: 500 }
    )
  }

  // 로그 저장(실패 무시)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('chat_logs').insert({ user_id: user_id ?? null, question, answer })
  } catch {}

  // 응답 + 쿠키
  const res = NextResponse.json({ answer }, { status: 200 })
  if (!greetedToday) {
    res.cookies.set('coach_last_greet', today, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' })
  }
  return res
}
