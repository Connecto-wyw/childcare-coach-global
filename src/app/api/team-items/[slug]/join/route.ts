import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

export async function POST(req: Request, { params }: Params) {
  const sb = supabaseAdmin()
  const body = await req.json().catch(() => null)
  const user_id = body?.user_id as string | undefined

  if (!user_id) {
    return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 })
  }

  const { data: item, error: itemErr } = await sb
    .from('team_items')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle()

  if (itemErr || !item) {
    return NextResponse.json({ ok: false, error: itemErr?.message ?? 'Not found' }, { status: 404 })
  }

  const { error: insErr } = await sb
    .from('team_item_participants')
    .insert({ team_item_id: item.id, user_id })

  // 이미 참여한 경우(unique)면 무시 처리
  if (insErr && !String(insErr.message).toLowerCase().includes('duplicate')) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
