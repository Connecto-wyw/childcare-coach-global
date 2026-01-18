import { NextResponse } from 'next/server'
import { calcDiscountedPrice } from '@/lib/teamPricing'
import { supabaseAdmin } from '@/lib/supabaseServer'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

export async function GET(_req: Request, { params }: Params) {
  const sb = supabaseAdmin()

  const { data: item, error: itemErr } = await sb
    .from('team_items')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (itemErr || !item) {
    return NextResponse.json({ ok: false, error: itemErr?.message ?? 'Not found' }, { status: 404 })
  }

  const { count, error: cntErr } = await sb
    .from('team_item_participants')
    .select('*', { count: 'exact', head: true })
    .eq('team_item_id', item.id)

  if (cntErr) {
    return NextResponse.json({ ok: false, error: cntErr.message }, { status: 500 })
  }

  const participants = count ?? 0
  const finalPrice = calcDiscountedPrice({
    basePrice: item.base_price,
    minPrice: item.min_price,
    participants,
    discountStepPercent: item.discount_step_percent,
    discountStepEvery: item.discount_step_every,
    maxDiscountPercent: item.max_discount_percent,
  })

  return NextResponse.json({
    ok: true,
    item,
    participants,
    finalPrice,
  })
}
