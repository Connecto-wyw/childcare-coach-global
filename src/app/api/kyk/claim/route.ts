// src/app/api/kyk/claim/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const DRAFT_COOKIE = 'kyk_draft'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ✅ 여기서 “결과 계산”은 너가 가진 로직으로 대체하면 됨.
// 지금은 예시로 computed에 answers 그대로 넣음.
function computeResultFromAnswers(answers: any) {
  // TODO: 너의 MBTI/동물/문구 매핑 로직으로 교체
  return {
    primary_type: 'INTP',
    color: 'BLUE',
    profile: {
      animal: 'animal_fish',
      title: 'title_fish_honest',
      summary: 'summary_fish',
      keywords: ['keyword_learning_routine', 'keyword_focus', 'keyword_friends'], // 결과 페이지 하단 3개 키워드
    },
  }
}

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

    // ✅ 응답 객체 먼저 만들고, set-cookie가 필요하면 여기에 싣는다
    const res = NextResponse.json({ ok: false }, { status: 200 })

    // ✅ Next 16 cookies() 대응: getAll/setAll 패턴
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            res.cookies.set(name, value, options)
          })
        },
      },
    })

    // 1) 로그인 체크 (쿠키 기반 세션)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'not logged in' }, { status: 401 })
    }

    // 2) draft id 체크
    const draftId = cookieStore.get(DRAFT_COOKIE)?.value
    if (!draftId) {
      return NextResponse.json({ ok: false, error: 'no draft' }, { status: 400 })
    }

    // 3) draft 로드 (서비스 롤)
    const supabaseAdmin = admin()
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('kyk_drafts')
      .select('id, answers')
      .eq('id', draftId)
      .maybeSingle()

    if (draftError) {
      return NextResponse.json({ ok: false, error: draftError.message }, { status: 500 })
    }
    if (!draft) {
      return NextResponse.json({ ok: false, error: 'draft not found' }, { status: 404 })
    }

    // 4) 결과 계산
    const computed = computeResultFromAnswers(draft.answers)

    // 5) 결과 저장 (서비스 롤)
    const { error: insertError } = await supabaseAdmin.from('kyk_results').insert({
      user_id: user.id,
      draft_id: draftId,
      computed, // jsonb
    })

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
    }

    // 6) draft 쿠키 제거
    const okRes = NextResponse.json({ ok: true }, { status: 200 })
    okRes.cookies.set(DRAFT_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

    return okRes
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}