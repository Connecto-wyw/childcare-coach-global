// src/app/api/ask/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getSystemPrompt } from '@/lib/systemPrompt'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const key = (ip: string) => `${new Date().toISOString().slice(0, 10)}:${ip}`

type AskBody = { user_id?: string; question?: string }

export async function POST(req: Request) {
  const { user_id, question }: AskBody = await req.json()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'

  if (!question?.trim()) {
    return NextResponse.json(
      { error: 'bad_request', message: '질문이 비어 있습니다.' },
      { status: 400 }
    )
  }

  // 게스트 1일 2회 제한 (메모리 방식)
  if (!user_id) {
    const k = key(ip)
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
    return NextResponse.json(
      { error: 'config', message: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }
  const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-mini'

  // 오늘 인사 여부 쿠키로 판별
  const jar = await cookies()
  const today = new Date().toISOString().slice(0, 10)
  const greetedToday = jar.get('coach_last_greet')?.value === today

  // 시스템 프롬프트(END 마커 규칙 포함)
  const systemPrompt = getSystemPrompt({ greetedToday })

  // 답변 생성
  let answer = ''
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 20000)

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 900,        // 여유
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

    if (!resp.ok) {
      const t = await resp.text()
      console.error('GPT 오류:', t)
      return NextResponse.json(
        { error: 'upstream', message: '응답이 지연됩니다. 잠시 후 다시 시도해 주세요.' },
        { status: 502 }
      )
    }

    type Choice = { message?: { content?: string }, finish_reason?: string }
    const data: { choices?: Choice[] } = await resp.json()
    const firstMsg = data.choices?.[0]
    const part = firstMsg?.message?.content ?? ''
    const finish = firstMsg?.finish_reason
    answer = part.replace(/\s*\[END\]\s*$/,'')

    // 길이로 끊겼으면 이어쓰기
    if (finish && finish !== 'stop') {
      const contResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          max_tokens: 300,
          stop: ['[END]'],
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
            { role: 'assistant', content: part },
            { role: 'user', content: '방금 답변이 끊겼다. 마지막 문장부터 자연스럽게 마무리하고, 끝에 [END]로 종료하라.' }
          ],
        }),
      })
      if (contResp.ok) {
        const contData: { choices?: Choice[] } = await contResp.json()
        const tail = contData.choices?.[0]?.message?.content ?? ''
        answer += tail.replace(/\s*\[END\]\s*$/,'')
      }
    }
  } catch (e: unknown) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    return NextResponse.json(
      {
        error: 'exception',
        message: isAbort ? '응답 지연으로 중단되었습니다.' : '처리 중 문제가 발생했습니다.',
      },
      { status: 500 }
    )
  }

  // 로그 저장 (실패해도 사용자 응답은 반환)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('chat_logs').insert({
      user_id: user_id ?? null,
      question,
      answer,
    })
  } catch (e) {
    console.error('로그 저장 실패:', e)
  }

  // 응답 + 쿠키 세팅(오늘 첫 응답이면 기록)
  const res = NextResponse.json({ answer }, { status: 200 })
  if (!greetedToday) {
    res.cookies.set('coach_last_greet', today, {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    })
  }
  return res
}
