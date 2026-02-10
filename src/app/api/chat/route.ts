// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

function getIp(h: any) {
  const xf = h.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  return h.get('x-real-ip') || null
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
    const sessionIdFromClient = safeString(body.sessionId).trim()

    if (!question) {
      return NextResponse.json({ error: 'invalid_question', requestId, stage }, { status: 400 })
    }

    stage = 'init_supabase'
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!url || !anon) {
      return NextResponse.json({ error: 'missing_supabase_env', requestId, stage }, { status: 500 })
    }
    if (!serviceKey) {
      return NextResponse.json({ error: 'missing_service_role_key', requestId, stage }, { status: 500 })
    }

    // ✅ sessionId: 클라이언트(localStorage) -> 쿠키 -> 서버 생성 순
    const cookieStore = await cookies()
    const SESSION_COOKIE = 'cc_session_id'
    let sessionId = sessionIdFromClient || cookieStore.get(SESSION_COOKIE)?.value

    if (!sessionId) {
      sessionId = randomUUID()
    }

    // 쿠키는 항상 세팅(있어도 갱신)
    cookieStore.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    // ✅ 일반 서버클라이언트(anon): auth/조회용 (RLS 적용)
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

    // ✅ admin client(service role): 저장용 (RLS 무시)
    const admin = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    })

    stage = 'auth_get_user'
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 로그인/비로그인 모두 허용
    const userId = user?.id ?? null

    // ✅ prevContext: 로그인 유저면 user_id로, 아니면 session_id로
    stage = 'load_prev_context'
    let prevContext = ''
    try {
      const q = supabase
        .from('chat_logs')
        .select('question, answer')
        .order('created_at', { ascending: false })
        .limit(2)

      const { data } = userId ? await q.eq('user_id', userId) : await q.eq('session_id', sessionId)

      if (data && data.length) {
        prevContext = data
          .map((r: any) => {
            const qq = r?.question ?? ''
            const aa = r?.answer ?? ''
            return `Q: ${qq}\nA: ${aa}`
          })
          .join('\n\n')
      }
    } catch {
      prevContext = ''
    }

    // ✅ greetedToday: 로그인 유저면 user_id 기준, 아니면 session_id 기준
    stage = 'count_today'
    const today = new Date().toISOString().slice(0, 10)
    let greetedToday = false
    try {
      const q = supabase
        .from('chat_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`)

      const { count } = userId ? await q.eq('user_id', userId) : await q.eq('session_id', sessionId)
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

    // ✅ chat_logs 저장: admin(service role)로 저장 => 비로그인/광고 유입 포함 100% 저장 시도
    stage = 'insert_logs'
    let insertOk = false
    let insertError: string | null = null

    const h = await headers()
    const { error: insErr } = await admin.from('chat_logs').insert({
      user_id: userId,        // 로그인 유저면 저장, 아니면 null
      session_id: sessionId,  // 비로그인 식별자 (필수)
      question,
      answer,
      model,
      lang: 'en',
      ip: getIp(h),
      user_agent: h.get('user-agent'),
      referer: h.get('referer'),
      path: req.nextUrl.pathname,
    } as any)

    if (insErr) {
      insertOk = false
      insertError = `${insErr.code ?? ''}:${insErr.message ?? 'insert_failed'}${(insErr as any)?.details ? ` | ${(insErr as any).details}` : ''}`
      console.error('[chat_logs insert error]', { requestId, userId, sessionId, insErr })
    } else {
      insertOk = true
    }

    stage = 'ok'
    return NextResponse.json(
      {
        answer,
        requestId,
        ms: Date.now() - startedAt,
        userId,
        sessionId,
        insertOk,
        insertError,
      },
      { status: 200 }
    )
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
