import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/coach'
  const oauthErr = url.searchParams.get('error')
  const oauthErrDesc = url.searchParams.get('error_description')

  if (oauthErr) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthErrDesc || oauthErr)}`, req.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url))
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url))
  }

  return NextResponse.redirect(new URL(next, req.url))
}
