// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getSystemPrompt, KYKProfile, LOCALE_LANGUAGE } from '@/lib/systemPrompt'
import { MBTI_TO_TCI } from '@/lib/kykScoring'
import type { MBTIType, TCIScore } from '@/lib/kykScoring'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// MBTI 타입 → 한국어 유형명 (kyk.json의 title_* 값)
const MBTI_TYPE_NAMES: Record<string, string> = {
  INTJ: '냉철한 부엉이형', INTP: '솔직한 물고기형', INFJ: '상상력 넘치는 풍뎅이형', INFP: '이상적인 나비형',
  ISTJ: '조용한 물고기형', ISTP: '관대한 부엉이형', ISFJ: '온화한 나비형',         ISFP: '감성적인 풍뎅이형',
  ENTJ: '야망있는 호랑이형', ENTP: '참견쟁이 늑대형', ENFJ: '조화로운 돌고래형',   ENFP: '열정적인 말형',
  ESTJ: '솔직한 늑대형',   ESTP: '활동적인 호랑이형', ESFJ: '에너지 넘치는 말형',  ESFP: '긍정적인 돌고래형',
}

// TCI 점수 → 영어 레벨 텍스트
const TCI_LEVEL: Record<TCIScore, string> = { 1: 'Low', 2: 'Normal', 3: 'High', 4: 'VeryHigh' }

function buildKYKProfile(mbtiType: string): KYKProfile | null {
  const upper = mbtiType.toUpperCase() as MBTIType
  const tci = MBTI_TO_TCI[upper]
  if (!tci) return null
  const tciSummary = [
    `NS:${TCI_LEVEL[tci.NS as TCIScore]}`,
    `HA:${TCI_LEVEL[tci.HA as TCIScore]}`,
    `RD:${TCI_LEVEL[tci.RD as TCIScore]}`,
    `P:${TCI_LEVEL[tci.PS as TCIScore]}`,
    `SD:${TCI_LEVEL[tci.SD as TCIScore]}`,
    `CO:${TCI_LEVEL[tci.CO as TCIScore]}`,
    `ST:${TCI_LEVEL[tci.ST as TCIScore]}`,
  ].join(', ')
  return {
    mbtiType: upper,
    typeName: MBTI_TYPE_NAMES[upper] ?? upper,
    tciSummary,
  }
}

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
 * ✅ 강제 고정 출력 모드: Korean Moms’ Favorite Picks
 * ---------------------------- */
const K_MOM_TAG = '[K_MOM_PICKS]'

const K_MOM_PICKS_TEXT = `Hello—I'm your AI Parenting Coach. Let me share a few things that many Korean moms genuinely love.
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

✔ Maintaining warmth
✔ Gentle, steady daily recovery routines
✔ Practical self-care that can be done at home

It is not about intensive treatment, but about creating a calm and supportive recovery environment.

4️⃣ K-Kids Silicone Tableware Set

Designed to support independent eating, this set emphasizes suction stability, food-grade silicone safety, and easy cleaning.

Korean parents often prioritize both safe materials and reducing mealtime stress.
It is a practical choice that balances functionality with clean, modern design.

If you would like to explore more trending parenting items from Korea,
👉 Visit the TEAM menu.

You can discover carefully selected, high-quality products that many Korean families already choose — offered at reasonable community-driven prices.`

function isKMomPicksMode(raw: string) {
  return (raw ?? '').includes(K_MOM_TAG)
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

    const kmomMode = isKMomPicksMode(rawQuestion)

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

    const h = await headers()
    const ip = getIp(h)
    const country = getCountry(h)
    const userAgent = h.get('user-agent')
    const referer = h.get('referer')

    if (kmomMode) {
      stage = 'kmom_fixed_answer'

      const answer = K_MOM_PICKS_TEXT

      stage = 'insert_logs'
      const { error: insErr } = await admin.from('chat_logs').insert({
        user_id: userId,
        email,
        session_id: sessionId,
        question: rawQuestion,
        answer,
        model: 'fixed:k_mom_picks',
        lang: 'en',
        ip,
        country,
        user_agent: userAgent,
        referer,
        path: req.nextUrl.pathname,
      } as any)

      const insertOk = !insErr
      const insertError = insErr
        ? `${(insErr as any).code ?? ''}:${(insErr as any).message ?? 'insert_failed'}${
            (insErr as any)?.details ? ` | ${(insErr as any).details}` : ''
          }`
        : null

      stage = 'ok_fixed'
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
          .map((r: any) => `Q: ${r?.question ?? ''}\nA: ${r?.answer ?? ''}`)
          .join('\n\n')
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

    stage = 'load_kyk'
    let kykProfile: KYKProfile | null = null
    if (userId) {
      try {
        const { data: kykData } = await supabase
          .from('kyk_results')
          .select('computed')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const primaryType = (kykData?.computed as any)?.primary_type
        if (primaryType) kykProfile = buildKYKProfile(primaryType)
      } catch {
        // KYK 결과 없어도 코치는 정상 작동
      }
    }

    stage = 'compose_system'
    const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'en'
    const language = LOCALE_LANGUAGE[locale] ?? 'English'
    const base = systemFromClient?.trim() || getSystemPrompt({ greetedToday, prevContext, kykProfile: kykProfile ?? undefined, locale })
    const kParentingRule = `
You answer in **${language} only**.
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
      question: rawQuestion,
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
          question: `${rawQuestion}\n\n(Continue. Do not repeat prior text. Conclude succinctly. End with [END].)`,
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

    const insertOk = !insErr
    const insertError = insErr
      ? `${(insErr as any).code ?? ''}:${(insErr as any).message ?? 'insert_failed'}${
          (insErr as any)?.details ? ` | ${(insErr as any).details}` : ''
        }`
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
        kMomMode: false,
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