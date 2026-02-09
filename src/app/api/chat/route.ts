// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { getSystemPrompt } from '@/lib/systemPrompt'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function trimToBytes(s: string, limit = 2000) {
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const bytes = enc.encode(s)
  if (bytes.length <= limit) return s
  return dec.decode(bytes.slice(0, limit))
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

async function openAIChat(model: string, system: string, question: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('MISSING_OPENAI_API_KEY')

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.OPENAI_ORG_ID ? { 'OpenAI-Organization': process.env.OPENAI_ORG_ID } : {}),
      ...(process.env.OPENAI_PROJECT_ID ? { 'OpenAI-Project': process.env.OPENAI_PROJECT_ID } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 1100,
      stop: ['[END]'],
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
    cache: 'no-store',
  })

  const text = await resp.text()
  if (!resp.ok) {
    throw new Error(`OPENAI_${resp.status}:${text.slice(0, 800)}`)
  }

  const data = JSON.parse(text) as any
  const part = (data?.choices?.[0]?.message?.content ?? '') as string
  const finish = (data?.choices?.[0]?.finish_reason ?? null) as string | null
  return { part, finish }
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID()
  const startedAt = Date.now()
  let stage = 'start'

  try {
    stage = 'parse_body'
    const body = await req.json().catch(() => ({} as any))
    const question = safeString(body.question).trim()
    const systemFromClient = safeString(body.system)

    if (!question) {
      return NextResponse.json({ error: 'invalid_question', requestId, stage }, { status: 400 })
    }

    stage = 'init_supabase'
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (!url || !anon) {
      return NextResponse.json({ error: 'missing_supabase_env', requestId, stage }, { status: 500 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(url, anon, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    })

    stage = 'auth_get_user'
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json({ error: 'unauthorized', requestId, stage }, { status: 401 })
    }

    // ✅ prevContext: RPC 말고 chat_logs에서 직전 Q/A 뽑아서 만든다 (타입 충돌 없음)
    stage = 'load_prev_context'
    let prevContext = ''
    try {
      const { data } = await supabase
        .from('chat_logs')
        .select('question, answer')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2)

      if (data && data.length) {
        prevContext = data
          .map((r) => {
            const q = (r as any).question ?? ''
            const a = (r as any).answer ?? ''
            return `Q: ${q}\nA: ${a}`
          })
          .join('\n\n')
      }
    } catch {
      prevContext = ''
    }

    // ✅ greetedToday: 오늘 chat_logs에 이미 기록이 있으면 true
    stage = 'count_today'
    const today = new Date().toISOString().slice(0, 10)
    let greetedToday = false
    try {
      const { count } = await supabase
        .from('chat_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00Z`)
      greetedToday = (count ?? 0) > 0
    } catch {
      greetedToday = false
    }

    stage = 'compose_system'
    const base = systemFromClient?.trim() || getSystemPrompt({ greetedToday, prevContext })
    const kParentingRule = `
You answer in **English only**.
If the user asks about **K-parenting / Korean parenting / parenting in Korea**:
- Emphasize benefits and strengths first.
- Mention at most **one** brief, minimized caution framed constructively.
- Keep the total answer under **~2000 bytes**.
- Do not repeat the final sentence. End cleanly.`.trim()
    const system = `${base}\n\n${kParentingRule}`

    stage = 'openai_first'
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    const { part, finish } = await openAIChat(model, system, question)

    let answer = String(part || '').replace(/\s*\[END\]\s*$/, '')

    // 이어쓰기 1회(필요 시)
    if (finish !== 'stop') {
      stage = 'openai_continue'
      try {
        const cont = await openAIChat(
          model,
          system,
          `${question}\n\n(Continue. Do not repeat prior text. Conclude succinctly. End with [END].)`
        )
        const tail = (cont.part || '').replace(/\s*\[END\]\s*$/, '')
        if (tail) answer += tail
      } catch {
        // 이어쓰기 실패는 무시
      }
    }

    stage = 'trim'
    answer = trimToBytes(answer, 2000)

    // ✅ chat_logs 저장: 너 테이블 스키마대로 question/answer로 1행 저장
    stage = 'insert_logs'
    try {
      await supabase.from('chat_logs').insert({
        user_id: user.id,
        question,
        answer,
        model,
        lang: 'en',
      })
    } catch {
      // 저장 실패해도 답변은 내려줌
    }

    stage = 'ok'
    return NextResponse.json({ answer, requestId, ms: Date.now() - startedAt }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'server_error',
        requestId,
        stage,
        message: String(e?.message ?? e).slice(0, 800),
      },
      { status: 500 }
    )
  }
}
