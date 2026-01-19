// src/app/api/team-items/[slug]/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseServer'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamItemRow = Database['public']['Tables']['team_items']['Row']

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug

    const body = (await req.json().catch(() => ({}))) as {
      local_user_id?: string
    }

    const localUserId = String(body.local_user_id ?? '').trim()
    if (!localUserId) {
      return NextResponse.json(
        { error: 'local_user_id required' },
        { status: 400 }
      )
    }

    const sb = getSupabaseAdmin()

    // 1) team_items에서 아이템 확인
    const { data: itemData, error: itemError } = await sb
      .from('team_items')
      .select('id, is_active')
      .eq('slug', slug)
      .maybeSingle()

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 })
    }

    const item = itemData as Pick<TeamItemRow, 'id' | 'is_active'> | null

    if (!item) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    if (!item.is_active) {
      return NextResponse.json({ error: 'inactive item' }, { status: 400 })
    }

    // 2) 이미 참여했는지 확인
    const { data: exists, error: existsError } = await sb
      .from('team_item_participants')
      .select('id')
      .eq('team_item_id', item.id)
      .eq('user_id', localUserId)
      .maybeSingle()

    if (existsError) {
      return NextResponse.json({ error: existsError.message }, { status: 500 })
    }

    // 3) 없으면 insert
    if (!exists) {
      const { error: insertError } = await sb
        .from('team_item_participants')
        .insert({
          team_item_id: item.id,
          user_id: localUserId,
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // 4) 참여자 수 리턴
    const { count, error: countError } = await sb
      .from('team_item_participants')
      .select('id', { count: 'exact', head: true })
      .eq('team_item_id', item.id)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    return NextResponse.json({ participant_count: count ?? 0 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
