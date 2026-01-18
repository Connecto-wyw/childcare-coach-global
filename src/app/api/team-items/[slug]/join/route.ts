// src/app/api/team-items/[slug]/join/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const body = await req.json().catch(() => ({}))
  const localUserId = String(body?.local_user_id ?? '').trim()
  if (!localUserId) {
    return NextResponse.json({ error: 'local_user_id required' }, { status: 400 })
  }

  const { data: item, error: itemError } = await supabase
    .from('team_items')
    .select('id,is_active')
    .eq('slug', params.slug)
    .maybeSingle()

  if (itemError || !item) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (!item.is_active) {
    return NextResponse.json({ error: 'inactive item' }, { status: 400 })
  }

  // 중복 참여는 DB 유니크 제약으로 막는 게 베스트
  const { error: insertError } = await supabase
    .from('team_item_participants')
    .insert({
      team_item_id: item.id,
      user_id: localUserId,
    })

  // 중복이면 그냥 “이미 참여”로 취급하고 카운트만 내려줘도 됨
  if (insertError) {
    // 여기서 insertError.code를 보고 중복 처리할 수도 있지만,
    // 일단 카운트 반환으로 UX 유지
    console.warn('join insert error', insertError)
  }

  const { count } = await supabase
    .from('team_item_participants')
    .select('id', { count: 'exact', head: true })
    .eq('team_item_id', item.id)

  return NextResponse.json({ ok: true, participant_count: count ?? 0 })
}
