import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용, 클라이언트에 노출 금지
)

export async function POST(req: Request) {
  const { email, keyword, order } = await req.json()
  // 이메일 도메인 제한
  if (!email?.toLowerCase().endsWith('@connecto-wyw.com')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { error } = await supabase.from('popular_keywords')
    .insert([{ keyword, order }])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
