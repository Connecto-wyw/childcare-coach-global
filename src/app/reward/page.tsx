// src/app/reward/page.tsx (Server Component)
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ClaimRow = {
  claimed_date: string
  streak_day: number
  awarded_points: number
}

type ProfileRow = {
  points: number | null
  reward_streak: number | null
  reward_last_date: string | null
}

function pointsForDay(day: number) {
  if (day >= 1 && day <= 6) return 100
  if (day === 7) return 300
  if (day >= 8 && day <= 13) return 100
  if (day === 14) return 600
  return 0
}

function format(n: number) {
  return n.toLocaleString('en-US')
}

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

  // ✅ Next 최신: cookies()가 Promise라 await 필요
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

export default async function RewardPage() {
  const supabase = await createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-white text-[#0e0e0e]">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-[22px] font-semibold">REWARD</h1>
          <p className="mt-3 text-gray-600">로그인 후 사용할 수 있어.</p>
          <Link href="/coach" className="mt-6 inline-block text-[#3497f3] underline">
            코치로 이동
          </Link>
        </div>
      </main>
    )
  }

  // ✅ profile 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('points, reward_streak, reward_last_date')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  const streak = Number(profile?.reward_streak ?? 0)
  const totalPoints = Number(profile?.points ?? 0)

  // ✅ reward_claims는 아직 database.types.ts에 없어서 타입 에러 남
  // -> 임시로 캐스팅해서 컴파일 통과시키자
  const { data: claimsRaw, error: claimsErr } = await (supabase as any)
    .from('reward_claims')
    .select('claimed_date, streak_day, awarded_points')
    .eq('user_id', user.id)
    .order('claimed_date', { ascending: false })
    .limit(14)

  if (claimsErr) {
    console.error('[reward_claims] error:', claimsErr)
  }

  const claims: ClaimRow[] = ((claimsRaw ?? []) as unknown) as ClaimRow[]

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-[22px] font-semibold">REWARD</h1>

        <div className="mt-6 bg-[#f0f7fd] p-5">
          <div className="text-[15px] font-medium">현재 연속 기록</div>
          <div className="mt-2 text-[28px] font-semibold">{streak}일</div>
          <div className="mt-2 text-[14px] text-gray-700">보유 포인트: {format(totalPoints)}</div>
        </div>

        <div className="mt-8">
          <div className="text-[15px] font-medium mb-3">14일 도장판</div>

          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 14 }).map((_, i) => {
              const day = i + 1
              const isDone = day <= streak && streak > 0
              const reward = pointsForDay(day)

              return (
                <div
                  key={day}
                  className={`border p-3 text-center ${
                    isDone ? 'bg-white border-[#3497f3]' : 'bg-[#fafafa] border-gray-200'
                  }`}
                >
                  <div className="text-[12px] text-gray-600">Day {day}</div>
                  <div className="mt-2 text-[18px]">{isDone ? '✅' : '⬜️'}</div>
                  <div className="mt-2 text-[12px] text-gray-600">{reward}p</div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 text-[13px] text-gray-700 leading-relaxed">
            - 하루에 질문 1개만 해도 그날 보상 지급<br />
            - 14일 완료 후 다음날 연속 기록 시 1일차로 다시 시작<br />
          </div>

          <div className="mt-8">
            <div className="text-[15px] font-medium mb-3">최근 획득 내역</div>
            {claims.length === 0 ? (
              <div className="text-[14px] text-gray-500">아직 획득 내역이 없어.</div>
            ) : (
              <ul className="space-y-2">
                {claims.map((c, idx) => (
                  <li key={idx} className="text-[14px] text-gray-700">
                    {c.claimed_date} · {c.streak_day}일차 · +{c.awarded_points}p
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
