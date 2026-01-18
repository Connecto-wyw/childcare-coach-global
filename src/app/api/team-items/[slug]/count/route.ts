import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamItemRow = Database['public']['Tables']['team_items']['Row']

function getAdminClient(): SupabaseClient<Database> {
  // ✅ supabaseAdmin이 "함수"로 export 된 경우 대응
  const maybe = supabaseAdmin as unknown
  const client =
    typeof maybe === 'function' ? (maybe as () => SupabaseClient<Database>)() : (maybe as SupabaseClient<Database>)
  return client
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params
  if (!slug) return NextResponse.json({ error: 'missing slug' }, { status: 400 })

  const sb = getAdminClient()

  const { data: item, error: itemErr } = await sb
    .from('team_items')
    .select('id')
    .eq('slug', slug)
    .maybeSingle<TeamItemRow>()

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  if (!item?.id) return NextResponse.json({ participant_count: 0 })

  const { count, error: countErr } = await sb
    .from('team_item_participants')
    .select('id', { count: 'exact', head: true })
    .eq('team_item_id', item.id)

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 })

  return NextResponse.json({ participant_count: count ?? 0 })
}
