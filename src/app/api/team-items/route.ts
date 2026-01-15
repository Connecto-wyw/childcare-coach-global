import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = supabaseAdmin()

  const { data, error } = await sb
    .from('team_items')
    .select('id,title,slug,description,tags,cover_image_url,is_active,base_price,min_price,discount_step_percent,discount_step_every,max_discount_percent')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, items: data ?? [] })
}
