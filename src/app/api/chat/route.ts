// src/app/api/chat/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const SYSTEM_PROMPT =
  '너는 AI 육아코치다. 부모의 질문을 간결하고 실용적으로 답한다. 단정은 피하고 조심스럽게 조언한다. 300자 이내.'

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, reply: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  const { messages = [] } = await req.json()

  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 15000)

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
      cache: 'no-store',
      signal: ac.signal,
    })
    clearTimeout(timer)

    if (!resp.ok) {
      const t = await resp.text()
      console.error('GPT API 오류:', t)
      return NextResponse.json(
        { success: false, reply: '응답이 지연됩니다. 잠시 후 다시 시도해 주세요.' },
        { status: 502 }
      )
    }

    const data = await resp.json()
    const reply =
      data.choices?.[0]?.message?.content?.trim() || '응답을 받지 못했습니다.'

    return NextResponse.json({ success: true, reply }, { status: 200 })
  } catch (e: any) {
    console.error('예외:', e?.message || e)
    return NextResponse.json(
      { success: false, reply: '처리 중 문제가 발생했습니다. 다시 시도해 주세요.' },
      { status: 500 }
    )
  }
}
