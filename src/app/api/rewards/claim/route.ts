// src/app/api/rewards/claim/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database, Tables } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const REWARDS = [
  100, 100, 100, 100, 100, 100, // 1-6
  300, // 7
  100, 100, 100, 100, 100, 100, // 8-13
  600, // 14
]

function ymdInKST(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(d) // YYYY-MM-DD
}

function addDays(ymd: string, delta: number) {
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

function mustEnv(name: string) {
  const v = (process.env[name] || '').trim()
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

async function createSupabaseServer() {
  const url = mustEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = mustEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const cookieStore = await cookies()

  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        } catch {}
      },
    },
  })
}

// ✅ "오늘(한국시간)" 질문 1개 이상 했는지 체크
async function hasQuestionToday(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  userId: string,
  todayKst: string
) {
  const { data, error } = await supabase
    .from('chat_logs')
    .select('created_at, question')
    .eq('user_id', userId)
    .not('question', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return false

  const rows = (data ?? []) as Array<{ created_at: string | null; question: string | null }>
  for (const r of rows) {
    const q = String(r.question ?? '').trim()
    if (!q) continue
    if (!r.created_at) continue
    const kstDay = ymdInKST(new Date(r.created_at))
    if (kstDay === todayKst) return true
  }
  return false
}

export async function POST() {
  const supabase = await createSupabaseServer()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
  }

  const today = ymdInKST(new Date())
  const yesterday = addDays(today, -1)

  // 1) 오늘 질문 했는지
  const okQuestion = await hasQuestionToday(supabase, user.id, today)
  if (!okQuestion) {
    return NextResponse.json({ ok: false, reason: 'no_question_today' }, { status: 200 })
  }

  // 2) profiles에서 streak 기준 데이터 가져오기
  type ProfilePick = Pick<Tables<'profiles'>, 'points' | 'reward_last_date' | 'reward_streak'>

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('points, reward_last_date, reward_streak')
    .eq('id', user.id)
    .maybeSingle()

  if (profErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(profErr.message ?? profErr) },
      { status: 500 }
    )
  }

  const p = (prof as ProfilePick | null) ?? null
  const currentPoints = Number(p?.points ?? 0)
  const lastDate = (p?.reward_last_date ?? null) as string | null
  const lastStreak = Number(p?.reward_streak ?? 0)

  // 3) 이미 오늘 받았으면 종료
  if (lastDate === today) {
    return NextResponse.json({ ok: false, reason: 'already_claimed' }, { status: 200 })
  }

  // 4) reward_claims 중복 방지
  const { data: claimedRow, error: chkErr } = await supabase
    .from('reward_claims')
    .select('id')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle()

  if (chkErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(chkErr.message ?? chkErr) },
      { status: 500 }
    )
  }

  if (claimedRow) {
    return NextResponse.json({ ok: false, reason: 'already_claimed' }, { status: 200 })
  }

  // 5) 연속 streak 계산
  const nextTotalStreak = lastDate === yesterday ? Math.max(1, lastStreak + 1) : 1

  // 6) 14일 사이클 포지션(1~14)
  const cyclePos = ((nextTotalStreak - 1) % 14) + 1
  const rewardPoints = REWARDS[cyclePos - 1] ?? 100

  // 7) reward_claims insert (현재 스키마: user_id, day)
  const { error: insErr } = await supabase.from('reward_claims').insert({
    user_id: user.id,
    day: today,
  })

  if (insErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(insErr.message ?? insErr) },
      { status: 500 }
    )
  }

  // 8) profiles 업데이트
  const nextPoints = currentPoints + rewardPoints

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      points: nextPoints,
      reward_last_date: today,
      reward_streak: nextTotalStreak,
    })
    .eq('id', user.id)

  if (updErr) {
    return NextResponse.json(
      { ok: false, reason: 'db_error', error: String(updErr.message ?? updErr) },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    points_added: rewardPoints,
    cycle_pos: cyclePos,
    streak_total: nextTotalStreak,
  })
}
