// src/app/api/chat/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSystemPrompt } from '@/lib/systemPrompt'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, reply: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  const body = (await req.json()) as { messages?: ChatMessage[] }
  const messages = body?.messages ?? []

  // 오늘 인사 여부 쿠키 확인
  const jar = await cookies()
  const today = new Date().toISOString().slice(0, 10)
  const greetedToday = jar.get('coach_last_greet')?.value === today

  // 공통 시스템 프롬프트
  const systemPrompt = getSystemPrompt({ greetedToday })

  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 15_000)

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
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
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

    const data: { choices?: { message?: { content?: string } }[] } =
      await resp.json()

    const reply =
      data.choices?.[0]?.message?.content?.trim() || '응답을 받지 못했습니다.'

    // 응답 + 오늘 인사 쿠키 설정
    const res = NextResponse.json({ success: true, reply }, { status: 200 })
    if (!greetedToday) {
      res.cookies.set('coach_last_greet', today, {
        path: '/',
        maxAge: 60 * 60 * 24,
        sameSite: 'lax',
      })
    }
    return res
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : 'unknown error'
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    console.error('예외:', errMsg)

    return NextResponse.json(
      {
        success: false,
        reply: isAbort
          ? '응답이 지연됩니다. 다시 시도해 주세요.'
          : '처리 중 문제가 발생했습니다. 다시 시도해 주세요.',
      },
      { status: 500 }
    )
  }
}
