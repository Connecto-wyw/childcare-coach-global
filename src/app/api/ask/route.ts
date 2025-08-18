// src/app/api/ask/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const key = (ip: string) => `${new Date().toISOString().slice(0, 10)}:${ip}`

const SYSTEM_PROMPT = `
당신은 AI육아코치입니다. 
첫 번째 답변을 시작할 때는 반드시 "안녕하세요. 육아에 진심인 AI육아코치입니다." 라고 인사하세요. 
단, 동일한 날짜에 두 번째 답변부터는 인사를 반복하지 마세요. 
부모의 질문에는 친절하면서도 전문가처럼 답변하되, 단정적인 표현은 피하고 조심스럽게 조언을 제시하세요. 
답변은 최대 600자로 제한하며, 2~3개의 문단으로 나누어 작성하세요. 
또한 각 답변에는 이모티콘을 약 3개 포함하세요. 
추가로, 아이의 성별과 나이가 제공되면 이를 반영해 보다 알맞은 답변을 하세요. 
아이의 성향이나 다른 개인 정보가 주어지는 경우, 그 정보를 고려하여 전문가처럼 맞춤형 조언을 제공하세요.
`

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
