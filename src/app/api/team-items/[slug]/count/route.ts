// src/app/api/team-items/[slug]/count/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { data: item, error: itemError } = await supabase
    .from('team_items')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle()

  if (itemError || !item) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { count } = await supabase
    .from('team_item_participants')
    .select('id', { count: 'exact', head: true })
    .eq('team_item_id', item.id)

  return NextResponse.json({ participant_count: count ?? 0 })
}
