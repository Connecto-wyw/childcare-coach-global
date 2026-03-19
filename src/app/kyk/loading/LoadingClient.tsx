// src/app/kyk/loading/LoadingClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types'
import { loadLocalAnswers } from '@/lib/kykClient'
import { computeColor } from '@/lib/kykScoring'

const themeVars = {
  Blue: { bg: 'linear-gradient(135deg, #2b99cc, #0f3b75)' },
  Red: { bg: 'linear-gradient(135deg, #ef4444, #7f1d1d)' },
  Green: { bg: 'linear-gradient(135deg, #10b981, #064e3b)' },
  Yellow: { bg: 'linear-gradient(135deg, #eab308, #713f12)' },
  White: { bg: 'linear-gradient(135deg, #94a3b8, #475569)' },
}

export default function LoadingClient({ dict }: { dict: any }) {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient<Database>(), [])

  const [busyLogin, setBusyLogin] = useState(false)
  const [needLogin, setNeedLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState(themeVars.Blue.bg)
  const [hasStarted, setHasStarted] = useState(false)

  // 401 loop prevention
  const isAfterLogin = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('after') === 'login'

  useEffect(() => {
    if (hasStarted) return
    setHasStarted(true)

    // 1. loadLocalAnswers (localStorage fallback 처리)
    const answers = loadLocalAnswers()
    if (!answers || !answers.q1_adjectives || answers.q1_adjectives.length === 0) {
      // Empty! Fallback to step3
      router.replace('/kyk/step3')
      return
    }

    // 2. Compute color from answers
    try {
      const adjectiveColor = computeColor(answers)
      const themeBg = themeVars[adjectiveColor as keyof typeof themeVars]?.bg || themeVars.Blue.bg
      setBgColor(themeBg)
    } catch {
      setBgColor(themeVars.Blue.bg)
    }

    // 3. Process API sequence
    processClaim(answers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, router])
  
  async function processClaim(answers: any) {
    try {
      const startRes = await fetch('/api/kyk/start', { method: 'POST' })
      let forcedDraftId = null
      if (startRes.ok) {
        const startJson = await startRes.json().catch(() => ({}))
        forcedDraftId = startJson.draft_id
      }
      
      const saveRes = await fetch('/api/kyk/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, draft_id: forcedDraftId }),
      })
      if (!saveRes.ok && saveRes.status !== 401) throw new Error('Failed to save draft.')

      const claimReqBody = forcedDraftId ? JSON.stringify({ draft_id: forcedDraftId }) : undefined
      const claimRes = await fetch('/api/kyk/claim', { 
        method: 'POST', 
        headers: forcedDraftId ? { 'Content-Type': 'application/json' } : undefined,
        body: claimReqBody 
      })

      if (claimRes.ok) {
        router.replace('/kyk/result')
        return
      }

      if (claimRes.status === 401) {
        if (isAfterLogin) {
            // 401 무한 루프 방지
          setError(dict.result?.failed_load || "Login session invalid or expired. Please try again.")
        } else {
          setNeedLogin(true)
        }
        return
      }

      const json = await claimRes.json().catch(() => ({}))
      setError(json?.error ?? `HTTP Error ${claimRes.status}`)
    } catch (err: any) {
      setError(err?.message ?? "An error occurred while processing.")
    }
  }

  async function onGoogleLogin() {
    try {
      setBusyLogin(true)
      setError(null)
      document.cookie = 'kyk_auth_return=/kyk/loading?after=login; path=/; max-age=300; SameSite=Lax'
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      const { error: supaErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { prompt: 'select_account' }
        }
      })
      if (supaErr) setError(supaErr.message)
    } finally {
      setBusyLogin(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 transition-all duration-1000" style={{ background: bgColor }}>
      {!needLogin && !error && (
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 border-[5px] border-white/30 border-t-white rounded-full animate-spin mb-6 drop-shadow-md"></div>
          <p className="text-white text-[17px] font-semibold animate-pulse tracking-wide drop-shadow-md">{dict.result?.preparing_result || '표고를 준비 중입니다...'}</p>
        </div>
      )}
      
      {/* loading 실패 UI (retry) */}
      {error && (
        <div className="bg-white/95 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center backdrop-blur-sm">
           <h3 className="text-[20px] font-bold text-red-600 mb-3">처리 중 오류가 발생했습니다</h3>
           <p className="text-gray-600 mb-8 text-[14px] leading-relaxed break-keep">{error}</p>
           <div className="flex flex-col gap-3">
             <button onClick={() => { setError(null); setHasStarted(false); }} className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-[15px] font-bold hover:bg-blue-700 transition shadow-md active:scale-[0.98]">{dict.result?.btn_retry || 'Try again'}</button>
             <button onClick={() => router.replace('/kyk/step3')} className="w-full py-3.5 border border-gray-200 text-gray-700 rounded-xl text-[15px] font-medium hover:bg-gray-50 transition active:scale-[0.98]">{dict.gate?.btn_back || 'Back'}</button>
           </div>
        </div>
      )}

      {needLogin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="w-full max-w-sm rounded-[24px] bg-white p-7 shadow-2xl animate-[float_0.3s_ease-out]">
            <div className="text-[19px] font-bold text-gray-900">{dict.gate?.modal_title || 'Google login required'}</div>
            <div className="mt-3 text-[14.5px] leading-relaxed text-gray-600">{dict.gate?.modal_desc || 'You need to log in to save your KYK results.'}</div>
            
            <div className="mt-8 flex gap-3">
              <button onClick={() => { setNeedLogin(false); router.replace('/kyk/step3'); }} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3.5 text-[15px] font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95" disabled={busyLogin}>{dict.gate?.btn_back || 'Back'}</button>
              <button onClick={onGoogleLogin} className="flex-1 rounded-2xl px-4 py-3.5 text-[15px] font-semibold bg-[#3497f3] text-white hover:brightness-95 transition active:scale-95 shadow-md" disabled={busyLogin}>{busyLogin ? (dict.gate?.btn_opening || 'Opening...') : (dict.gate?.btn_ok || 'OK')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
