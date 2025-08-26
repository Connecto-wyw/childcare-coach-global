// src/app/api/ask/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getSystemPrompt } from '@/lib/systemPrompt'
import { randomUUID } from 'crypto'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const keyOf = (ip: string) => `${new Date().toISOString().slice(0, 10)}:${ip}`

type AskBody = { user_id?: string; question?: string }
type Role = 'system' | 'user' | 'assistant'
type ChatMessage = { role: Role; content: string }
type ChatBody = {
  temperature?: number
  max_tokens?: number
  stop?: string[]
  messages: ChatMessage[]
}
type Choice = { message?: { content?: string }, finish_reason?: string }
type ChatAPIResponse = { choices?: Choice[] }

function mkHeaders(key: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
  if (process.env.OPENAI_ORG_ID) h['OpenAI-Organization'] = process.env.OPENAI_ORG_ID!
  if (process.env.OPENAI_PROJECT_ID) h['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID!
  return h
}

async function callOpenAI(model: string, body: ChatBody, key: string, attempts = 3): Promise<Response> {
  let last: Response | null = null
  for (let i = 1; i <= attempts; i++) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: mkHeaders(key),
      body: JSON.stringify({ ...body, model }),
      cache: 'no-store',
    })
    if (resp.ok) return resp

    if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
      const ra = parseInt(resp.headers.get('retry-after') || '0', 10)
      const backoff = Math.max(ra * 1000, 400 * i * i)
      await new Promise(r => setTimeout(r, backoff))
      last = resp
      continue
    }
    return resp
  }
  return last as Response
}

// "요약: ..." 한 줄만 추출
function extractSummary(text?: string | null) {
  if (!text) return ''
  const m = text.match(/^\s*요약:\s*(.+)$/m)
  return m ? m[1].trim() : ''
}

// [END] 제거 + 요약 중복 제거
function normalizeAnswer(text: string) {
  let t = text.replace(/\s*\[END\]\s*$/,'')
  const lines = t.split('\n')
  const summaryIdxs = lines
    .map((ln, i) => ({ ln, i }))
    .filter(x => /^\s*요약:\s*/.test(x.ln))
    .map(x => x.i)

  if (summaryIdxs.length > 1) {
    const keep = summaryIdxs[summaryIdxs.length - 1]
    t = lines.filter((_, i) => i === keep || !summaryIdxs.includes(i)).join('\n')
  }
  return t
}

export async function POST(req: Request) {
  const { user_id, question }: AskBody = await req.json()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'
  if (!question?.trim()) {
    return NextResponse.json({ error: 'bad_request', message: '질문이 비어 있습니다.' }, { status: 400 })
  }

  // 게스트 1일 2회 제한
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

  // 경량 모델 기본값 + 폴백 체인
  const primary = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const models = [primary, 'gpt-4o', 'gpt-5']

  // 쿠키 및 인사 여부
  const jar = await cookies()
  const today = new Date().toISOString().slice(0, 10)
  const greetedToday = jar.get('coach_last_greet')?.value === today

  // 세션 식별자(sid) 준비(게스트 컨텍스트 이어주기)
  let sid = jar.get('coach_sid')?.value
  if (!sid) sid = randomUUID()

  // 직전 요약 불러오기 → prevContext로 주입
  let prevContext = ''
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const col = user_id ? { user_id } : { sid }
    const { data } = await supabase
      .from('chat_logs')
      .select('answer')
      .match(col as any)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    prevContext = extractSummary(data?.answer)
  } catch {
    prevContext = ''
  }

  const systemPrompt = getSystemPrompt({ greetedToday, prevContext })

  const baseBody: ChatBody = {
    temperature: 0.35,
    max_tokens: 900,
    stop: ['[END]'],
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  }

  let answer = ''
  let firstPart = ''
  let usedModel = ''

  // 1차 시도: 순차 폴백
  for (const m of models) {
    const resp = await callOpenAI(m, baseBody, OPENAI_API_KEY, 3)
    if (resp.ok) {
      const data = (await resp.json()) as ChatAPIResponse
      const c = data.choices?.[0]
      firstPart = c?.message?.content ?? ''
      answer = normalizeAnswer(firstPart)
      usedModel = m
      break
    } else if (m === models[models.length - 1]) {
      const bodyText = await resp.text().catch(() => '')
      return NextResponse.json(
        { error: 'upstream', status: resp.status, body: bodyText.slice(0, 2000) },
        { status: resp.status }
      )
    }
  }

  // 이어쓰기 1회
  if (firstPart && !/\[END\]\s*$/.test(firstPart)) {
    const contBody: ChatBody = {
      temperature: 0.35,
      max_tokens: 600,
      stop: ['[END]'],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
        { role: 'assistant', content: firstPart },
        {
          role: 'user',
          content:
            '방금 답변이 끊겼다. 마지막 문장부터 자연스럽게 마무리하되, 이미 출력한 결론·요약·마지막 문단을 반복하지 말고 새로운 마무리 문장으로 끝내라. 끝에 [END]로 종료하라.'
        },
      ],
    }
    const cont = await callOpenAI(usedModel, contBody, OPENAI_API_KEY, 2)
    if (cont.ok) {
      const contData = (await cont.json()) as ChatAPIResponse
      const tail = contData.choices?.[0]?.message?.content ?? ''
      answer = normalizeAnswer(answer + (tail || ''))
    }
  }

  // 로그 저장(실패 무시)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('chat_logs').insert({ user_id: user_id ?? null, sid, question, answer })
  } catch {}

  const res = NextResponse.json({ answer, model: usedModel }, { status: 200 })

  // 쿠키 설정
  res.cookies.set('coach_sid', sid, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  if (!greetedToday) {
    res.cookies.set('coach_last_greet', today, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' })
  }
  return res
}
