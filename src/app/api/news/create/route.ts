import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function pick(str: string, re: RegExp): string | null {
  const m = re.exec(str)
  return m?.[1]?.trim() || null
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // TODO: 관리자 체크(이메일/roles)
  // if (!ADMIN_CONDITION) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { url } = await req.json()
  try { new URL(url) } catch { return NextResponse.json({ error: 'invalid url' }, { status: 400 }) }

  // 원문 가져오기
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) return NextResponse.json({ error: `fetch failed ${res.status}` }, { status: 502 })
  const html = await res.text()

  // 타이틀 추출(og:title 우선, 없으면 <title>)
  const og = pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)
  const tt = og ?? pick(html, /<title[^>]*>([^<]+)<\/title>/i) ?? '제목없음'

  // 슬러그 자동 생성(충돌 시 뒤에 날짜 붙임)
  let slug = slugify(tt)
  if (!slug) slug = 'news'
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'')
  // 슬러그 충돌 검사
  const { data: exist } = await supabase.from('news_posts').select('id').eq('slug', slug).maybeSingle()
  if (exist) slug = `${slug}-${today}`

  const { error } = await supabase.from('news_posts').insert({
    url, title: tt, slug
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, title: tt, slug })
}
