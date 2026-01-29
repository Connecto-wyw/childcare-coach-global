// src/app/admin/team/[teamId]/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { requireAdmin } from '@/lib/adminguard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type DiscountStep = { participants: number; discount_percent: number }

function safeNum(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parseDiscountSteps(input: string): DiscountStep[] {
  const raw = (input ?? '').trim()
  if (!raw) return []

  // 1) JSON 배열 우선
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      return arr
        .map((x) => ({
          participants: safeNum((x as any)?.participants, 0),
          discount_percent: safeNum((x as any)?.discount_percent, 0),
        }))
        .filter((s) => s.participants > 0 && s.discount_percent >= 0)
        .sort((a, b) => a.participants - b.participants)
    }
  } catch {
    // ignore
  }

  // 2) fallback: "10:5\n30:10" 같은 라인 파싱 (participants:discount)
  const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean)
  const steps: DiscountStep[] = []
  for (const line of lines) {
    const m = line.match(/^(\d+)\s*[:=,\s]\s*(\d+(\.\d+)?)$/)
    if (!m) continue
    steps.push({ participants: Number(m[1]), discount_percent: Number(m[2]) })
  }
  return steps.sort((a, b) => a.participants - b.participants)
}

function stringifySteps(steps: any): string {
  try {
    if (!steps) return '[]'
    if (typeof steps === 'string') return steps
    return JSON.stringify(steps, null, 2)
  } catch {
    return '[]'
  }
}

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

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

async function loadTeamAndPricing(teamId: string) {
  const supabase = await createSupabaseServer()

  const [{ data: team, error: teamErr }, { data: pricing, error: pricingErr }] = await Promise.all([
    supabase
      .from('teams')
      .select('id,name,purpose,image_url,tag1,tag2,detail_image_url,detail_markdown,created_at')
      .eq('id', teamId)
      .maybeSingle(),
    supabase
      .from('team_pricing_rules')
      .select('*')
      .eq('team_id', teamId)
      .maybeSingle(),
  ])

  return {
    team,
    teamErr,
    pricing,
    pricingErr,
  }
}

export default async function AdminTeamDetailPage({ params }: { params: { teamId: string } }) {
  // ✅ admin guard
  const { ok } = await requireAdmin()
  if (!ok) redirect('/')

  const teamId = String(params?.teamId ?? '').trim()
  if (!teamId) redirect('/admin/team')

  const { team, teamErr, pricing, pricingErr } = await loadTeamAndPricing(teamId)

  if (teamErr || !team) {
    return (
      <main className="min-h-screen bg-white text-[#111]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[22px] font-semibold">Admin · Team not found</h1>
          <p className="mt-2 text-[13px] text-[#666]">teamId: {teamId}</p>

          <pre className="mt-6 whitespace-pre-wrap rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-[12px]">
{JSON.stringify({ teamErr }, null, 2)}
          </pre>

          <div className="mt-6 flex gap-3">
            <Link href="/admin/team" className="text-[#3497f3] text-[14px] font-medium hover:underline">
              Back to Admin TEAM →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ------ defaults from DB ------
  const name = String((team as any).name ?? '')
  const purpose = String((team as any).purpose ?? '')
  const image_url = String((team as any).image_url ?? '')
  const tag1 = String((team as any).tag1 ?? '')
  const tag2 = String((team as any).tag2 ?? '')
  const detail_image_url = String((team as any).detail_image_url ?? '')
  const detail_markdown = String((team as any).detail_markdown ?? '')

  const base_price = safeNum((pricing as any)?.base_price ?? 0, 0)
  const min_price = safeNum((pricing as any)?.min_price ?? 0, 0)
  const currency = String((pricing as any)?.currency ?? 'KRW')
  const discount_steps_raw = (pricing as any)?.discount_steps ?? []
  const discount_steps_json = stringifySteps(discount_steps_raw)

  async function saveAction(formData: FormData) {
    'use server'

    const { ok, supabase } = await requireAdmin()
    if (!ok) redirect('/')

    const sb = supabase

    const teamId = String(formData.get('teamId') ?? '').trim()
    if (!teamId) throw new Error('teamId missing')

    // team fields
    const name = String(formData.get('name') ?? '').trim()
    const purpose = String(formData.get('purpose') ?? '').trim()
    const image_url = String(formData.get('image_url') ?? '').trim()
    const tag1 = String(formData.get('tag1') ?? '').trim()
    const tag2 = String(formData.get('tag2') ?? '').trim()

    // detail content
    const detail_image_url = String(formData.get('detail_image_url') ?? '').trim()
    const detail_markdown = String(formData.get('detail_markdown') ?? '').trim()

    // pricing fields
    const currency = String(formData.get('currency') ?? 'KRW').trim() || 'KRW'
    const base_price = safeNum(formData.get('base_price'), 0)
    const min_price = safeNum(formData.get('min_price'), 0)

    // discount steps input (JSON textarea)
    const stepsText = String(formData.get('discount_steps') ?? '').trim()
    const steps = parseDiscountSteps(stepsText)

    // ✅ 서버에서 최소한의 검증
    if (!name) throw new Error('name required')

    // (선택) min_price는 base_price보다 클 수 없음
    if (min_price > 0 && base_price > 0 && min_price > base_price) {
      throw new Error('min_price cannot be greater than base_price')
    }

    // 1) update teams
    const { error: teamErr } = await sb
      .from('teams')
      .update({
        name,
        purpose: purpose || null,
        image_url: image_url || null,
        tag1: tag1 || null,
        tag2: tag2 || null,
        // ✅ 아래 2개 컬럼은 SQL로 추가된 상태여야 함
        detail_image_url: detail_image_url || null,
        detail_markdown: detail_markdown || null,
      } as any)
      .eq('id', teamId)

    if (teamErr) throw new Error(`teams update failed: ${teamErr.message}`)

    // 2) upsert pricing (team_id unique 필요)
    //    pricing을 아직 안 만들었어도 여기서 생성됨
    const { error: priceErr } = await sb
      .from('team_pricing_rules')
      .upsert(
        {
          team_id: teamId,
          base_price: base_price || 0,
          min_price: min_price || null,
          currency,
          discount_steps: steps,
        } as any,
        { onConflict: 'team_id' }
      )

    if (priceErr) throw new Error(`pricing upsert failed: ${priceErr.message}`)

    redirect(`/admin/team/${teamId}?saved=1`)
  }

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold">Admin · Team Detail</h1>
            <p className="mt-1 text-[13px] text-[#666]">teamId: {teamId}</p>
            {(pricingErr as any)?.message ? (
              <p className="mt-1 text-[13px] text-[#b91c1c]">pricing load warning: {(pricingErr as any).message}</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/team/${teamId}`}
              className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium hover:bg-[#fafafa]"
            >
              View public →
            </Link>
            <Link
              href="/admin/team"
              className="rounded-xl border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium hover:bg-[#fafafa]"
            >
              Back →
            </Link>
          </div>
        </div>

        {/* saved banner */}
        {'saved' in (Object.fromEntries([]) as any) ? null : null}

        <form action={saveAction} className="mt-8 grid gap-8">
          <input type="hidden" name="teamId" value={teamId} />

          {/* 1) Team basic */}
          <section className="rounded-2xl border border-[#e9e9e9] p-6">
            <h2 className="text-[18px] font-semibold">1) Team Basic</h2>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-[13px] font-medium text-[#444]">Team name</label>
                <input
                  name="name"
                  defaultValue={name}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                  placeholder="Team name"
                  required
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-[#444]">Purpose (short description)</label>
                <textarea
                  name="purpose"
                  defaultValue={purpose}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px] min-h-[110px]"
                  placeholder="What is this team for?"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[13px] font-medium text-[#444]">Thumbnail image_url</label>
                  <input
                    name="image_url"
                    defaultValue={image_url}
                    className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                    placeholder="https://..."
                  />
                  <p className="mt-1 text-[12px] text-[#777]">리스트/카드에 보이는 썸네일</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-medium text-[#444]">Tag 1</label>
                    <input
                      name="tag1"
                      defaultValue={tag1}
                      className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                      placeholder="e.g. Gentle Discipline"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-[#444]">Tag 2</label>
                    <input
                      name="tag2"
                      defaultValue={tag2}
                      className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                      placeholder="e.g. ADHD"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2) Detail content */}
          <section className="rounded-2xl border border-[#e9e9e9] p-6">
            <h2 className="text-[18px] font-semibold">2) Detail Page Content</h2>
            <p className="mt-1 text-[13px] text-[#666]">
              팀 상세(/team/[teamId])에서 “추가 이미지 + 상세 텍스트”로 쓸 데이터
            </p>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-[13px] font-medium text-[#444]">Detail image_url</label>
                <input
                  name="detail_image_url"
                  defaultValue={detail_image_url}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                  placeholder="https://..."
                />
                <p className="mt-1 text-[12px] text-[#777]">상세 상단/중간에 들어갈 이미지(선택)</p>
              </div>

              <div>
                <label className="text-[13px] font-medium text-[#444]">Detail markdown</label>
                <textarea
                  name="detail_markdown"
                  defaultValue={detail_markdown}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px] min-h-[220px]"
                  placeholder={`예)\n- 이 팀에서 뭘 하는지\n- 누구에게 추천인지\n- 참여 방법/규칙\n\n마크다운으로 써도 됨`}
                />
              </div>
            </div>
          </section>

          {/* 3) Pricing */}
          <section className="rounded-2xl border border-[#e9e9e9] p-6">
            <h2 className="text-[18px] font-semibold">3) Pricing</h2>
            <p className="mt-1 text-[13px] text-[#666]">
              base_price(시작가), min_price(최저가), discount_steps(할인 단계)
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-[13px] font-medium text-[#444]">Currency</label>
                <input
                  name="currency"
                  defaultValue={currency}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                  placeholder="KRW"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-[#444]">Base price</label>
                <input
                  name="base_price"
                  defaultValue={String(base_price || '')}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                  placeholder="e.g. 39000"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-[#444]">Min price</label>
                <input
                  name="min_price"
                  defaultValue={String(min_price || '')}
                  className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[14px]"
                  placeholder="e.g. 19000"
                  inputMode="numeric"
                />
                <p className="mt-1 text-[12px] text-[#777]">최저가는 옵션(없으면 비워도 됨)</p>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-[13px] font-medium text-[#444]">Discount steps (JSON)</label>
              <textarea
                name="discount_steps"
                defaultValue={discount_steps_json}
                className="mt-2 w-full rounded-xl border border-[#e5e5e5] px-4 py-3 text-[13px] min-h-[200px] font-mono"
              />
              <p className="mt-2 text-[12px] text-[#777]">
                포맷: <span className="font-mono">[{"{"}"participants":10,"discount_percent":5{"}"}, ...]</span>
                <br />
                또는 라인 입력도 가능: <span className="font-mono">10:5</span> (10명 = 5% 할인)
              </p>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/admin/team"
              className="rounded-xl border border-[#e5e5e5] px-5 py-3 text-[14px] font-medium hover:bg-[#fafafa]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#111] px-6 py-3 text-[14px] font-semibold text-white hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>

        {/* debug */}
        <details className="mt-10 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <summary className="cursor-pointer text-[13px] font-semibold">Debug (loaded data)</summary>
          <pre className="mt-3 whitespace-pre-wrap text-[12px]">
{JSON.stringify({ team, pricing }, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  )
}
