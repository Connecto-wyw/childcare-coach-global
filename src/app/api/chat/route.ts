// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import OpenAI from 'openai'
import { getSystemPrompt } from '@/lib/systemPrompt'

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

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  try {
    // 1) 입력 파싱
    const body = await req.json().catch(() => ({} as any))
    const question = safeString(body.question).trim()
    const systemFromClient = safeString(body.system)

    // 2) 요청 기본 로그
    console.log('[api/chat] request', {
      requestId,
      hasCookieHeader: Boolean(req.headers.get('cookie')),
      cookieHeaderLen: req.headers.get('cookie')?.length ?? 0,
      ua: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      origin: req.headers.get('origin'),
      hasQuestion: Boolean(question),
      questionLen: question.length,
    })

    if (!question) {
      return NextResponse.json({ error: 'invalid_question', requestId }, { status: 400 })
    }

    // ✅ 여기 핵심: 너 프로젝트 타입 정의상 options에는 cookies만 넣을 수 있음
    // cookies()는 (Next 버전에 따라) Promise를 리턴하는 함수고, auth-helpers 타입이 그걸 그대로 기대함
    const supabase = createRouteHandlerClient({ cookies })

    // 3) Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      console.error('[api/chat] unauthorized', {
        requestId,
        userErr: userErr ? { message: userErr.message, name: (userErr as any).name } : null,
      })
      return NextResponse.json({ error: 'unauthorized', requestId }, { status: 401 })
    }

    console.log('[api/chat] authed', { requestId, userId: user.id })

    // 4) prevContext (RPC)
    let prevContext = ''
    const rpc = await supabase.rpc('get_prev_context', { p_user_id: user.id })
    if (rpc.error) {
      console.error('[api/chat] get_prev_context rpc error', {
        requestId,
        message: rpc.error.message,
        code: (rpc.error as any).code,
        details: (rpc.error as any).details,
      })
    } else if (rpc.data) {
      prevContext = String(rpc.data)
    }

    // 5) greetedToday 판단
    const today = new Date().toISOString().slice(0, 10)
    const { count, error: countErr } = await supabase
      .from('chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)

    if (countErr) {
      console.error('[api/chat] chat_logs count error', {
        requestId,
        message: countErr.message,
        code: (countErr as any).code,
        details: (countErr as any).details,
      })
    }

    const greetedToday = (count ?? 0) > 0

    // 6) system prompt 구성
    const base = systemFromClient?.trim() || getSystemPrompt({ greetedToday, prevContext })
    const kParentingRule = `
You answer in **English only**.
If the user asks about **K-parenting / Korean parenting / parenting in Korea**:
- Emphasize benefits and strengths first.
- Mention at most **one** brief, minimized caution framed constructively.
- Keep the total answer under **~2000 bytes**.
- Do not repeat the final sentence. End cleanly.`.trim()
    const system = `${base}\n\n${kParentingRule}`

    // 7) OpenAI 호출
    const apiKey = process.env.OPENAI_API_KEY
    const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

    if (!apiKey) {
      console.error('[api/chat] missing OPENAI_API_KEY', { requestId })
      return NextResponse.json({ error: 'missing_openai_key', requestId }, { status: 500 })
    }

    const openai = new OpenAI({
      apiKey,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID,
    })

    let part = ''
    let finish: string | null | undefined = null

    try {
      const first = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: question },
        ],
        temperature: 0.4,
        max_tokens: 1100,
        stop: ['[END]'],
      })

      part = first.choices[0]?.message?.content ?? ''
      finish = first.choices[0]?.finish_reason
    } catch (err: any) {
      console.error('[api/chat] openai first call error', {
        requestId,
        name: err?.name,
        message: err?.message,
        status: err?.status,
        code: err?.code,
      })
      return NextResponse.json({ error: 'openai_error', requestId }, { status: 500 })
    }

    let answer = part.replace(/\s*\[END\]\s*$/, '')

    // 8) 이어쓰기 1회(필요 시)
    if (finish !== 'stop') {
      try {
        const cont = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: question },
            { role: 'assistant', content: part },
            { role: 'user', content: 'Do not repeat prior text. Conclude succinctly. End with [END].' },
          ],
          temperature: 0.35,
          max_tokens: 400,
          stop: ['[END]'],
        })
        const tail = cont.choices[0]?.message?.content ?? ''
        answer += tail.replace(/\s*\[END\]\s*$/, '')
      } catch (err: any) {
        console.error('[api/chat] openai continuation error', {
          requestId,
          name: err?.name,
          message: err?.message,
          status: err?.status,
          code: err?.code,
        })
      }
    }

    answer = trimToBytes(answer, 2000)

    // 9) 로그 저장(실패해도 답변은 내려줌)
    const turnId = crypto.randomUUID()
    const { error: insertErr } = await supabase.from('chat_logs').insert([
      { user_id: user.id, role: 'user', content: question, turn_id: turnId },
      { user_id: user.id, role: 'assistant', content: answer, turn_id: turnId },
    ])
    if (insertErr) {
      console.error('[api/chat] chat_logs insert error', {
        requestId,
        message: insertErr.message,
        code: (insertErr as any).code,
        details: (insertErr as any).details,
      })
    }

    console.log('[api/chat] ok', {
      requestId,
      ms: Date.now() - startedAt,
      userId: user.id,
      model: MODEL,
    })

    return NextResponse.json({ answer, requestId })
  } catch (e: any) {
    console.error('[api/chat] fatal', {
      requestId,
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
    })
    return NextResponse.json({ error: 'server_error', requestId }, { status: 500 })
  }
}
