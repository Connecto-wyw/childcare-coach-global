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

// Vercel/Proxy 환경에서 국가코드 힌트 (없으면 null)
// - Vercel: x-vercel-ip-country
// - Cloudflare: cf-ipcountry
// - 기타: x-country-code (커스텀)
function getCountry(h: Headers) {
  const v = h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('x-country-code') || ''
  const cc = v.trim().toUpperCase()
  if (!cc || cc === 'XX') return null
  // 보통 2자리 국가코드
  return cc.slice(0, 2)
}

/* -----------------------------
 * ✅ 강제 모드: Korean Moms’ Favorite Picks
 * ---------------------------- */
const K_MOM_TAG = '[K_MOM_PICKS]'
const K_MOM_FINAL_LINE =
  'Visit our TEAM menu to discover Korean moms’ favorite items and buy great quality at a more reasonable price.'

function extractKMomMode(input: string) {
  const text = input ?? ''
  if (!text.includes(K_MOM_TAG)) return { isMode: false, cleaned: text }
  const cleaned = text.replaceAll(K_MOM_TAG, '').trim()
  return { isMode: true, cleaned }
}

/**
 * ✅ 가장 강력한 방식: OpenAI가 말 새면 무조건 깨짐.
 * 버튼 질문([K_MOM_PICKS])은 아예 고정 텍스트로 반환한다.
 * - 형식/문단/개행 100% 고정
 * - 마지막 TEAM 문구 100% 보장
 */
function kMomPicksFixedAnswer() {
  // Markdown + 섹션 사이 빈 줄(\n\n) 확실히 넣어서 ChatBox에서 문단이 정상 분리되게 함
  return [
    `### Korean Moms’ Favorite Picks`,
    ``,
    `#### A) Beauty items moms use together with kids`,
    `- Mineral family sunscreen — gentle daily protection for sensitive skin. (6m+ if needed)`,
    `- Fragrance-free body wash — simple, non-stripping cleanser for everyone. (newborn+ options exist)`,
    `- Barrier cream/ointment — quick support for dry patches and irritation. (newborn+)`,
    `- Gentle moisturizer — daily hydration that works for both mom and child. (newborn+)`,
    `- Mild lip balm — easy “together use” for cold/windy days. (3y+ if needed)`,
    ``,
    `#### B) Items for kids (daily essentials)`,
    `- Kids toothbrush + fluoride toothpaste — the most consistent routine Korean moms keep. (age-appropriate)`,
    `- Stainless steel water bottle — durable, leak-resistant, and easy to clean. (3y+ spout/straw)`,
    `- Thick unscented wet wipes — everyday essential for outings and quick cleanups. (all ages)`,
    `- Kids vitamins — commonly used as a simple daily support routine. (age-appropriate)`,
    `- Small humidifier — popular for dry seasons to support comfort at home. (all ages)`,
    ``,
    K_MOM_FINAL_LINE,
  ].join('\n')
}

function kMomPicksSystemPrompt(baseSystem: string) {
  // baseSystem은 유지하되, 아래 룰이 최우선으로 작동하도록 "강제" 규칙을 맨 아래에 붙임
  // (모델이 base를 따르느라 흐트러지는 것을 막기 위해, 강제 규칙을 매우 구체적으로 작성)
  const forced = [
    `You are in a STRICT response mode: "Korean Moms’ Favorite Picks".`,
    `You MUST follow ALL rules exactly. If any rule conflicts, prioritize these rules.`,
    ``,
    `OUTPUT RULES (MANDATORY):`,
    `- Language: English only.`,
    `- Provide exactly 10 recommendations total.`,
    `- Split into exactly 2 sections with these exact headings:`,
    `  A) Beauty items moms use together with kids`,
    `  B) Items for kids (daily essentials)`,
    `- Each section must list exactly 5 items.`,
    `- Each item must be exactly ONE bullet line in this format:`,
    `  - Item name — short reason (max 16 words). (Age note if needed)`,
    `- Items must be realistic and commonly used by Korean moms. Avoid rare luxury/niche items.`,
    `- No questions. No disclaimers. No extra paragraphs. No extra sections.`,
    `- After the 10 bullets, add exactly ONE final line, and NOTHING after it, exact text:`,
    `"${K_MOM_FINAL_LINE}"`,
  ].join('\n')

  return `${baseSystem}\n\n${forced}`.trim()
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

    // ✅ 강제 모드 감지 + 태그 제거한 질문
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

    // ✅ sessionId: 클라이언트(localStorage) -> 쿠키 -> 서버 생성 순
    const SESSION_COOKIE = 'cc_session_id'
    let sessionId = sessionIdFromClient || cookieStore.get(SESSION_COOKIE)?.value

    if (!sessionId) sessionId = randomUUID()

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

    // ✅ auth user
    stage = 'auth_get_user'
    let authUserDetected = false
    let authError: string | null = null

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) authError = `${userErr.name}:${userErr.message}`
    const user = userData?.user ?? null
    if (user?.id) authUserDetected = true

    const userId = user?.id ?? null
    const email = user?.email ?? null

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
        prevContext = data.map((r: any) => `Q: ${r?.question ?? ''}\nA: ${r?.answer ?? ''}`).join('\n\n')
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

    // ✅ 공통 헤더 정보(로그 저장용)
    const h = await headers()
    const ip = getIp(h)
    const country = getCountry(h)
    const userAgent = h.get('user-agent')
    const referer = h.get('referer')

    /**
     * ✅ (핵심) K-MOM 모드면 OpenAI를 태우지 않고, 고정 답변으로 바로 반환
     * - 너가 원하는 "그대로 출력" 100% 보장
     * - 문단/리스트/마지막 문구 100% 고정
     */
    if (isKMomMode) {
      stage = 'k_mom_fixed_answer'
      let answer = kMomPicksFixedAnswer()
      answer = trimToBytes(answer, 2000)

      stage = 'insert_logs'
      const { error: insErr } = await admin.from('chat_logs').insert({
        user_id: userId,
        email,
        session_id: sessionId,
        question: rawQuestion, // ✅ 원문(태그 포함) 저장
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

    stage = 'compose_system'
    const base = systemFromClient?.trim() || getSystemPrompt({ greetedToday, prevContext })

    const kParentingRule = `
You answer in **English only**.
If the user asks about **K-parenting / Korean parenting / parenting in Korea**:
- Emphasize benefits and strengths first.
- Mention at most **one** brief, minimized caution framed constructively.
- Keep the total answer under **~2000 bytes**.
- Do not repeat the final sentence. End cleanly.`.trim()

    // ✅ 기본 system
    let system = `${base}\n\n${kParentingRule}`.trim()

    // (참고) 만약 나중에 K-MOM을 OpenAI로 다시 돌리고 싶으면 여기서만 켜면 됨
    // if (isKMomMode) system = kMomPicksSystemPrompt(system)

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

    // ✅ chat_logs 저장: admin(service role)로 저장
    stage = 'insert_logs'
    let insertOk = false
    let insertError: string | null = null

    const { error: insErr } = await admin.from('chat_logs').insert({
      user_id: userId, // 로그인 유저면 uuid, 아니면 null
      email, // ✅ 로그인 유저 이메일 저장 (컬럼 있어야 함)
      session_id: sessionId, // 비로그인 식별자 (필수)
      question: rawQuestion, // ✅ 원문(태그 포함) 저장
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
      console.error('[chat_logs insert error]', {
        requestId,
        stage,
        userId,
        email,
        sessionId,
        ip,
        country,
        insErr,
      })
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
