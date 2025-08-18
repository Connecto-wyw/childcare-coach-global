// src/app/api/ask/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const key = (ip: string) => `${new Date().toISOString().slice(0, 10)}:${ip}`

const SYSTEM_PROMPT =
  '너는 AI 육아코치다. 부모의 질문에 간결하고 실용적으로 답한다. 단정은 피하고 조심스럽게 조언한다. 300자 이내.'

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

  // 게스트 1일 2회 제한 (메모리 방식: 배포/스케일 시 초기화됨)
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

  // 답변 생성
  let answer = ''
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 15000)

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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

    const data: { choices?: { message?: { content?: string } }[] } = await resp.json()
    answer = data.choices?.[0]?.message?.content?.trim() || '응답을 받지 못했습니다.'
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

  return NextResponse.json({ answer }, { status: 200 })
}
