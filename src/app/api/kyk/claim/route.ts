// src/app/api/kyk/claim/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

import { computeMBTI, MBTI_TO_TCI, MBTI_PERCENTAGES } from '@/lib/kykScoring'

const DRAFT_COOKIE = 'kyk_draft'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function computeResultFromAnswers(answers: any) {
  const mbti = computeMBTI(answers)
  const tci = MBTI_TO_TCI[mbti]
  const percentage = MBTI_PERCENTAGES[mbti]
  const typeKey = mbti.toLowerCase()

  const colors: Record<string, string> = {
    INTJ: '#8B572A', INTP: '#4A90E2', INFJ: '#50E3C2', INFP: '#B8E986',
    ISTJ: '#D0021B', ISTP: '#F5A623', ISFJ: '#417505', ISFP: '#9013FE',
    ENTJ: '#8B572A', ENTP: '#4A90E2', ENFJ: '#50E3C2', ENFP: '#B8E986',
    ESTJ: '#D0021B', ESTP: '#F5A623', ESFJ: '#417505', ESFP: '#9013FE',
  }

  return {
    primary_type: mbti,
    color: colors[mbti] || '#3497f3',
    percentage,
    tci,
    profile: {
      animal: `animal_${typeKey}`,
      title: `title_${typeKey}`,
      summary: `summary_${typeKey}`,
      keywords: [
        `keyword_${typeKey}_1`,
        `keyword_${typeKey}_2`,
        `keyword_${typeKey}_3`,
      ],
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
    const body = await _req.json().catch(() => null)
    const draftId = cookieStore.get(DRAFT_COOKIE)?.value || body?.draft_id
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
    const { error: insertError } = await supabaseAdmin.from('kyk_results').upsert({
      user_id: user.id,
      draft_id: draftId,
      computed, // jsonb
    }, { onConflict: 'user_id' })

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