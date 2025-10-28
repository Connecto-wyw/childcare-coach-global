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

// ---------- Supabase Admin (Service Role) ----------
function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ---------- Types ----------
type AskBody = { user_id?: string; question?: string; system?: string }
type Role = 'system' | 'user' | 'assistant'
type ChatMessage = { role: Role; content: string }
type ChatBody = { temperature?: number; max_tokens?: number; stop?: string[]; messages: ChatMessage[] }
type Choice = { message?: { content?: string }; finish_reason?: string }
type ChatAPIResponse = { choices?: Choice[] }

// ---------- OpenAI helpers ----------
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

// ---------- Text helpers ----------
function extractSummary(text?: string | null) {
  if (!text) return ''
  const m = text.match(/^\s*요약:\s*(.+)$/m)
  return m ? m[1].trim() : ''
}

function normalizeAnswer(text: string) {
  let t = text.replace(/\s*\[END\]\s*$/, '')
  const lines = t.split('\n')
  const idxs = lines.map((ln, i) => ({ ln, i })).filter(x => /^\s*요약:\s*/.test(x.ln)).map(x => x.i)
  if (idxs.length > 1) {
    const keep = idxs[idxs.length - 1]
    t = lines.filter((_, i) => i === keep || !idxs.includes(i)).join('\n')
  }
  return t
}

// ---------- Device ID helpers ----------
function ipFingerprint(ip: string, ua: string) {
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)
}
type CookieStore = Awaited<ReturnType<typeof cookies>>
function resolveDeviceId(jar: CookieStore, ip: string, ua: string) {
  const did = jar.get('coach_did')?.value
  if (did) return { deviceId: did, setCookie: false }
  return { deviceId: `ip_${ipFingerprint(ip, ua)}`, setCookie: true }
}

// ---------- Cut-off heuristic ----------
function isLikelyCutOff(text: string) {
  const s = text.trim()
  if (!s) return true
  if (/[.!?]$/.test(s) || /다[.]?$/.test(s)) return false
  if (s.length < 300) return true
  const last = s.split('\n').reverse().find(Boolean) || ''
  return last.length < 10
}

// ---------- Handler ----------
export async function POST(req: Request) {
  const { user_id, question, system }: AskBody = await req.json()
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local'
  const ua = req.headers.get('user-agent') || 'ua'
  if (!question?.trim()) {
    return NextResponse.json({ error: 'bad_request', message: '질문이 비어 있습니다.' }, { status: 400 })
  }

  // guest rate limit
  if (!user_id) {
    const k = keyOf(ip); const used = guestMap.get(k) ?? 0
    if (used >= GUEST_LIMIT) {
      return NextResponse.json({ error: 'guest_limit_exceeded', message: '게스트는 하루 2회까지 질문 가능합니다.' }, { status: 403 })
    }
    guestMap.set(k, used + 1)
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return NextResponse.json({ error: 'config', message: 'OPENAI_API_KEY 누락' }, { status: 500 })

  const primary = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const models = [primary, 'gpt-4o', 'gpt-5']

  const jar = await cookies()
  const today = new Date().toISOString().slice(0, 10)
  const greetedToday = jar.get('coach_last_greet')?.value === today

  // stable device id + sid
  const { deviceId, setCookie } = resolveDeviceId(jar, ip, ua)
  let sid = jar.get('coach_sid')?.value
  if (!sid) sid = user_id ?? randomUUID()

  // prevContext: user 우선, 아니면 device 기반
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

  // ---------- System prompt composition ----------
  const baseSystem = (system?.trim() && system) || getSystemPrompt({ greetedToday, prevContext })

  const kParentingRule = `
You answer in **English only**.
When a query is about **K-parenting / Korean parenting / parenting in Korea**, you must:
- Emphasize the strengths and positive practices first.
- If you mention concerns, include **only one** brief caution, minimized and framed constructively.
- Keep the total answer under **~2000 bytes**. Prefer concise paragraphs or short bullet points.
- Do not repeat the closing sentence. End cleanly.`.trim()

  const finalSystem = `${baseSystem}\n\n${kParentingRule}`

  const baseBody: ChatBody = {
    temperature: 0.35,
    max_tokens: 1100,        // ≈2000 bytes 목표 대비 여유
    stop: ['[END]'],
    messages: [
      { role: 'system', content: finalSystem },
      { role: 'user', content: question },
    ],
  }

  let answer = ''
  let firstPart = ''
  let usedModel = ''

  // 1차 응답
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

  // 이어쓰기: 명백히 잘린 경우 1회 연장
  if (firstPart && !/\[END\]\s*$/.test(firstPart) && isLikelyCutOff(firstPart)) {
    const contBody: ChatBody = {
      temperature: 0.35,
      max_tokens: 700,
      stop: ['[END]'],
      messages: [
        { role: 'system', content: finalSystem },
        { role: 'user', content: question },
        { role: 'assistant', content: firstPart },
        { role: 'user', content: 'Do not repeat prior text. Conclude succinctly. End with [END].' },
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

  // save log
  try {
    const sb = admin()
    const { error } = await sb.from('chat_logs').insert({
      user_id: user_id ?? null,
      device_id: deviceId,
      sid: sid.toString(),
      question,
      answer,
      summary,
    })
    if (error) console.error('chat_logs insert error', error)
  } catch (e) {
    console.error('chat_logs insert exception', e)
  }

  const res = NextResponse.json({ answer, model: usedModel, sid, device_id: deviceId }, { status: 200 })

  if (setCookie) res.cookies.set('coach_did', deviceId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  res.cookies.set('coach_sid', sid, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  if (!greetedToday) res.cookies.set('coach_last_greet', today, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' })

  return res
}
