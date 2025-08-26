// src/app/api/ask/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSystemPrompt } from '@/lib/systemPrompt'
import { randomUUID, createHash } from 'crypto'

const GUEST_LIMIT = 2
const guestMap = new Map<string, number>()
const keyOf = (ip: string) => `${new Date().toISOString().slice(0, 10)}:${ip}`

type AskBody = { user_id?: string; question?: string }
type Role = 'system' | 'user' | 'assistant'
type ChatMessage = { role: Role; content: string }
type ChatBody = { temperature?: number; max_tokens?: number; stop?: string[]; messages: ChatMessage[] }
type Choice = { message?: { content?: string }, finish_reason?: string }
type ChatAPIResponse = { choices?: Choice[] }

// --- Supabase Admin ---
function admin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// hash(ip + ua)
function ipFingerprint(ip: string, ua: string) {
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)
}

// stable device id
function resolveDeviceId(jar: ReturnType<typeof cookies> extends Promise<infer R> ? R : any, ip: string, ua: string) {
  const fromCookie = jar.get('coach_did')?.value // 디바이스 키
  if (fromCookie) return { deviceId: fromCookie, setCookie: false }
  const ipKey = `ip_${ipFingerprint(ip, ua)}`
  return { deviceId: ipKey, setCookie: true } // 처음엔 ip 기반. 이후 쿠키 심어 고정.
}

function mkHeaders(key: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
  if (process.env.OPENAI_ORG_ID) h['OpenAI-Organization'] = process.env.OPENAI_ORG_ID!
  if (process.env.OPENAI_PROJECT_ID) h['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID!
  return h
}

async function callOpenAI(model: string, body: ChatBody, key: string, attempts = 3): Promise<Response> {
  let last: Response | null = null
  for (let i = 1; i <= attempts; i++) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: mkHeaders(key), body: JSON.stringify({ ...body, model }), cache: 'no-store',
    })
    if (resp.ok) return resp
    if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
      const ra = parseInt(resp.headers.get('retry-after') || '0', 10)
      await new Promise(r => setTimeout(r, Math.max(ra * 1000, 400 * i * i)))
      last = resp; continue
    }
    return resp
  }
  return last as Response
}

function extractSummary(text?: string | null) {
  if (!text) return ''
  const m = text.match(/^\s*요약:\s*(.+)$/m)
  return m ? m[1].trim() : ''
}

function normalizeAnswer(text: string) {
  let t = text.replace(/\s*\[END\]\s*$/, '')
  const lines = t.split('\n')
  const summaryIdxs = lines.map((ln, i) => ({ ln, i })).filter(x => /^\s*요약:\s*/.test(x.ln)).map(x => x.i)
  if (summaryIdxs.length > 1) {
    const keep = summaryIdxs[summaryIdxs.length - 1]
    t = lines.filter((_, i) => i === keep || !summaryIdxs.includes(i)).join('\n')
  }
  return t
}

export async function POST(req: Request) {
  const { user_id, question }: AskBody = await req.json()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'
  const ua = req.headers.get('user-agent') || 'ua'
  if (!question?.trim()) return NextResponse.json({ error: 'bad_request', message: '질문이 비어 있습니다.' }, { status: 400 })

  // 게스트 1일 2회 제한
  if (!user_id) {
    const k = keyOf(ip)
    const used = guestMap.get(k) ?? 0
    if (used >= GUEST_LIMIT) {
      return NextResponse.json({ error: 'guest_limit_exceeded', message: '게스트는 하루 2회까지 질문 가능합니다.' }, { status: 403 })
    }
    guestMap.set(k, used + 1)
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return NextResponse.json({ error: 'config', message: 'OPENAI_API_KEY 누락' }, { status: 500 })

  // 모델
  const primary = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const models = [primary, 'gpt-4o', 'gpt-5']

  // 쿠키
  const jar = await cookies()
  const today = new Date().toISOString().slice(0, 10)
  const greetedToday = jar.get('coach_last_greet')?.value === today

  // 안정 sid: 로그인시 user_id, 아니면 deviceId(쿠키) → 없으면 ipFingerprint
  const { deviceId, setCookie } = resolveDeviceId(jar, ip, ua)
  const sid = user_id ?? deviceId // 로그인 사용자는 user_id가 곧 sid 역할

  // 직전 요약 → prevContext (user_id 우선, 아니면 device_id)
  let prevContext = ''
  try {
    const sb = admin()
    const base = sb.from('chat_logs').select('summary').order('created_at', { ascending: false }).limit(1)
    const { data, error } = user_id
      ? await base.eq('user_id', user_id).maybeSingle()
      : await base.eq('device_id', deviceId).maybeSingle()
    if (error) console.error('chat_logs select error', error)
    prevContext = (data?.summary as string) ?? ''
  } catch (e) {
    console.error('chat_logs select exception', e)
  }

  const systemPrompt = getSystemPrompt({ greetedToday, prevContext })
  const baseBody: ChatBody = {
    temperature: 0.35, max_tokens: 900, stop: ['[END]'],
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
  }

  let answer = ''
  let firstPart = ''
  let usedModel = ''

  for (const m of models) {
    const resp = await callOpenAI(m, baseBody, OPENAI_API_KEY, 3)
    if (resp.ok) {
      const data = (await resp.json()) as ChatAPIResponse
      firstPart = data.choices?.[0]?.message?.content ?? ''
      answer = normalizeAnswer(firstPart)
      usedModel = m
      break
    } else if (m === models[models.length - 1]) {
      const bodyText = await resp.text().catch(() => '')
      return NextResponse.json({ error: 'upstream', status: resp.status, body: bodyText.slice(0, 2000) }, { status: resp.status })
    }
  }

  if (firstPart && !/\[END\]\s*$/.test(firstPart)) {
    const contBody: ChatBody = {
      temperature: 0.35, max_tokens: 600, stop: ['[END]'],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
        { role: 'assistant', content: firstPart },
        { role: 'user', content: '방금 답변이 끊겼다. 이미 낸 결론·요약을 반복하지 말고 새로운 마무리 문장으로 끝내라. 끝에 [END]로 종료하라.' },
      ],
    }
    const cont = await callOpenAI(usedModel, contBody, OPENAI_API_KEY, 2)
    if (cont.ok) {
      const contData = (await cont.json()) as ChatAPIResponse
      const tail = contData.choices?.[0]?.message?.content ?? ''
      answer = normalizeAnswer(answer + (tail || ''))
    }
  }

  const summary = extractSummary(answer)

  // 저장: user_id, device_id 모두 기록. sid는 응답용 식별자.
  try {
    const sb = admin()
    const { error } = await sb.from('chat_logs').insert({
      user_id: user_id ?? null,
      device_id: deviceId,
      sid, // 참고용. 필요 없으면 제거 가능.
      question,
      answer,
      summary,
    })
    if (error) console.error('chat_logs insert error', error)
  } catch (e) {
    console.error('chat_logs insert exception', e)
  }

  const res = NextResponse.json({ answer, model: usedModel, sid }, { status: 200 })

  // 처음 온 손님이면 디바이스 쿠키 박제
  if (setCookie) {
    res.cookies.set('coach_did', deviceId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  }
  if (!greetedToday) {
    res.cookies.set('coach_last_greet', today, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' })
  }
  return res
}
