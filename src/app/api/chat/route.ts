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

function getIp(h: Headers) {
  const xf = h.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  return h.get('x-real-ip') || null
}

function getCountry(h: Headers) {
  const v = h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('x-country-code') || ''
  const cc = v.trim().toUpperCase()
  if (!cc || cc === 'XX') return null
  return cc.slice(0, 2)
}

/* -----------------------------
 * ✅ 강제 고정 출력 모드: Korea Mom's Favorite Picks
 * - "프롬프트"가 아니라 "서버에서 고정 텍스트 그대로 반환"
 * - 1글자도 바뀌면 안 되는 요구사항에 대한 유일한 안전한 방법
 * ---------------------------- */
const K_MOM_TAG = '[K_MOM_PICKS]'

function extractKMomMode(input: string) {
  const text = input ?? ''
  if (!text.includes(K_MOM_TAG)) return { isMode: false, cleaned: text }
  const cleaned = text.replaceAll(K_MOM_TAG, '').trim()
  return { isMode: true, cleaned }
}

/**
 * ✅ 사용자가 준 텍스트를 "단 한 글자도 수정하지 않고" 그대로 반환
 * - 아래 문자열은 사용자가 준 본문을 그대로 복붙한 것
 * - 개행 포함 (ReactMarkdown에서 문단 구분되도록 원문 그대로 유지)
 */
function kMomPicksFixedAnswerExact() {
  return `Let me share a few things that many Korean moms genuinely love.
It’s not just about what’s trending — it means more to understand why they choose them.

1️⃣ Mommy & Child Beauty Essentials

In Korea, many families are moving away from strictly separate “kids-only” products.
Instead, there is a growing preference for gentle, clean beauty items that mothers and children can safely use together.

Cushion-style sunscreen compacts make it easier for children to apply sunscreen on their own, while water-washable play cosmetics combine safety with a touch of fun.

More than the product itself, many parents value the shared experience of daily routines done together.

2️⃣ Play-Based Learning Tools

Rather than focusing heavily on memorization, Korean early education increasingly emphasizes tools that stimulate thinking through play.

Magnetic blocks paired with structured activity sheets are especially popular.
Instead of simply stacking pieces, children are guided to recreate shapes or solve simple building challenges, naturally strengthening spatial awareness and problem-solving skills.

Talking pen systems are also widely used. By touching the pages of compatible books, children can hear stories and pronunciation, making language exposure feel interactive and self-directed.

It feels less like formal studying — and more like “thinking through play.”

3️⃣ Korean Postpartum Care Starter Kit

In Korea, postpartum recovery is treated as an essential stage of care.
This starter kit focuses on:

Maintaining warmth

Gentle, steady daily recovery routines

Practical self-care that can be done at home

It is not about intensive treatment, but about creating a calm and supportive recovery environment.

4️⃣ K-Kids Silicone Tableware Set

Designed to support independent eating, this set emphasizes suction stability, food-grade silicone safety, and easy cleaning.

Korean parents often prioritize both safe materials and reducing mealtime stress.
It is a practical choice that balances functionality with clean, modern design.

If you would like to explore more trending parenting items from Korea,
👉 Visit the TEAM menu.

You can discover carefully selected, high-quality products that many Korean families already choose — offered at reasonable community-driven prices.`
}

type OpenAIParams = {
  model: string
  system: string
  question: string
  temperature: number
  max_tokens: number
  stop?: string[]
}

async function openAIChat(params: OpenAIParams) {
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
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      stop: params.stop ?? ['[END]'],
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.question },
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
    const rawQuestion = safeString(body.question).trim()
    const systemFromClient = safeString(body.system)
    const sessionIdFromClient = safeString(body.sessionId).trim()

    if (!rawQuestion) {
      return NextResponse.json({ error: 'invalid_question', requestId, stage }, { status: 400 })
    }

    const { isMode: isKMomMode, cleaned: cleanedQuestion } = extractKMomMode(rawQuestion)
    const question = cleanedQuestion || rawQuestion

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

    const cookieStore = await cookies()

    const SESSION_COOKIE = 'cc_session_id'
    let sessionId = sessionIdFromClient || cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionId) sessionId = randomUUID()

    cookieStore.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

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

    const admin = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    })

    stage = 'auth_get_user'
    let authUserDetected = false
    let authError: string | null = null

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) authError = `${userErr.name}:${userErr.message}`
    const user = userData?.user ?? null
    if (user?.id) authUserDetected = true

    const userId = user?.id ?? null
    const email = user?.email ?? null

    // 공통 헤더
    const h = await headers()
    const ip = getIp(h)
    const country = getCountry(h)
    const userAgent = h.get('user-agent')
    const referer = h.get('referer')

    /**
     * ✅ 여기서 "그대로 출력" 확정
     */
    if (isKMomMode) {
      stage = 'k_mom_fixed_answer_exact'
      let answer = kMomPicksFixedAnswerExact()

      // 혹시라도 바이트 제한 걸릴까봐 안전장치 (지금 텍스트는 보통 2000바이트 넘을 수 있음)
      // ✅ 너는 "한 글자도 빠지면 안 됨"이므로, 여기 limit을 넉넉히 키워야 함.
      // -> 기존 2000 유지하면 텍스트가 잘릴 수 있다. 아래처럼 8000 정도로 올려.
      answer = trimToBytes(answer, 8000)

      stage = 'insert_logs'
      const { error: insErr } = await admin.from('chat_logs').insert({
        user_id: userId,
        email,
        session_id: sessionId,
        question: rawQuestion, // 태그 포함 원문 저장
        answer,
        model: 'fixed:k_mom_picks_exact',
        lang: 'en',
        ip,
        country,
        user_agent: userAgent,
        referer,
        path: req.nextUrl.pathname,
      } as any)

      const insertOk = !insErr
      const insertError = insErr
        ? `${insErr.code ?? ''}:${insErr.message ?? 'insert_failed'}` +
          ((insErr as any)?.details ? ` | ${(insErr as any).details}` : '')
        : null

      stage = 'ok'
      return NextResponse.json(
        {
          answer,
          requestId,
          ms: Date.now() - startedAt,
          userId,
          email,
          sessionId,
          insertOk,
          insertError,
          authUserDetected,
          authError,
          kMomMode: true,
        },
        { status: 200 }
      )
    }

    // ------- 일반 모드(OpenAI) -------
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
        prevContext = data.map((r: any) => `Q: ${r?.question ?? ''}\nA: ${r?.answer ?? ''}`).join('\n\n')
      }
    } catch {
      prevContext = ''
    }

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

    const system = `${base}\n\n${kParentingRule}`.trim()

    stage = 'openai_first'
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

    const { part, finish } = await openAIChat({
      model,
      system,
      question,
      temperature: 0.4,
      max_tokens: 1100,
      stop: ['[END]'],
    })

    let answer = String(part || '').replace(/\s*\[END\]\s*$/, '')

    if (finish !== 'stop') {
      stage = 'openai_continue'
      try {
        const cont = await openAIChat({
          model,
          system,
          question: `${question}\n\n(Continue. Do not repeat prior text. Conclude succinctly. End with [END].)`,
          temperature: 0.4,
          max_tokens: 700,
          stop: ['[END]'],
        })
        const tail = (cont.part || '').replace(/\s*\[END\]\s*$/, '')
        if (tail) answer += tail
      } catch {
        // ignore
      }
    }

    stage = 'trim'
    answer = trimToBytes(answer, 2000)

    stage = 'insert_logs'
    let insertOk = false
    let insertError: string | null = null

    const { error: insErr } = await admin.from('chat_logs').insert({
      user_id: userId,
      email,
      session_id: sessionId,
      question: rawQuestion,
      answer,
      model,
      lang: 'en',
      ip,
      country,
      user_agent: userAgent,
      referer,
      path: req.nextUrl.pathname,
    } as any)

    if (insErr) {
      insertOk = false
      insertError =
        `${insErr.code ?? ''}:${insErr.message ?? 'insert_failed'}` +
        ((insErr as any)?.details ? ` | ${(insErr as any).details}` : '')
      console.error('[chat_logs insert error]', { requestId, stage, userId, email, sessionId, ip, country, insErr })
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
        email,
        sessionId,
        insertOk,
        insertError,
        authUserDetected,
        authError,
        kMomMode: false,
      },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', requestId, stage, message: String(e?.message ?? e).slice(0, 800) },
      { status: 500 }
    )
  }
}
