'use client'

import { useState, useEffect } from 'react'
import { saveChatLog } from '@/lib/saveChatLog'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'

type ChatBoxProps = {
  systemPrompt?: string
  initialQuestion?: string
  chatInput?: string
  setChatInput?: React.Dispatch<React.SetStateAction<string>>
}

export default function ChatBox({
  systemPrompt,
  initialQuestion,
  chatInput,
  setChatInput,
}: ChatBoxProps) {
  const user = useUser()

  const [message, setMessage] = useState(chatInput || '')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // 카카오 로그인 여부 확정(세션 provider)
  const [isKakaoAuthed, setIsKakaoAuthed] = useState(false)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const prov = data.user?.app_metadata?.provider
      if (!cancel) setIsKakaoAuthed(!!data.user && prov === 'kakao')
    })()
    return () => { cancel = true }
  }, [user])

  // 비(카카오) 시도 카운트: 1~2회 허용, 3번째에 팝업
  const MAX_FREE_TRIES = 2
  const dayKey = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  const TRY_KEY = `aiCoachAnonTry:${dayKey()}`
  const readTry = () =>
    typeof window === 'undefined' ? 0 : Number(localStorage.getItem(TRY_KEY)) || 0

  const [anonTry, setAnonTry] = useState(0)
  const syncTryFromStorage = () => {
    const cur = readTry()
    if (typeof window !== 'undefined') localStorage.setItem(TRY_KEY, String(cur))
    setAnonTry(cur)
  }
  const incTry = () => {
    setAnonTry(prev => {
      const next = prev + 1
      if (typeof window !== 'undefined') localStorage.setItem(TRY_KEY, String(next))
      return next
    })
  }
  useEffect(() => {
    if (!isKakaoAuthed) syncTryFromStorage()
  }, [isKakaoAuthed])

  // 입력/준비/초기질문
  useEffect(() => { if (chatInput !== undefined) setMessage(chatInput) }, [chatInput])
  useEffect(() => { const t = setTimeout(() => setReady(true), 500); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (initialQuestion && ready) {
      setMessage(initialQuestion)
      sendMessage(initialQuestion)
      setChatInput?.(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, ready])

  // 로그인 유도 모달
  const [showLoginModal, setShowLoginModal] = useState(false)
  const handleConfirmLogin = async () => {
    setShowLoginModal(false)
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${location.origin}/auth/callback` }, // ✅ 현재 사이트 콜백
    })
  }

  const sendMessage = async (customMessage?: string) => {
    const text = (customMessage ?? message).trim()
    if (!text) return
    if (!ready) { setReply('초기화 중입니다. 잠시만 기다려 주세요.'); return }

    // 비(카카오): 3번째 클릭에 모달
    if (!isKakaoAuthed) {
      if (anonTry >= MAX_FREE_TRIES) {
        setShowLoginModal(true)
        return
      }
      incTry() // 1~2번째 시도 즉시 +1
    }

    setLoading(true)
    setReply('')
    try {
      const payload = {
        user_id: isKakaoAuthed ? user!.id : undefined,
        messages: [
          { role: 'system', content: systemPrompt || '당신은 친절하지만 현실적인 육아 전문가입니다. 정확하고 신중하게 답변하세요.' },
          { role: 'user', content: text },
        ],
      }
      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json()
      setReply(data?.reply || '답변을 가져오지 못했어요.')
      if (isKakaoAuthed) await saveChatLog(text, data?.reply ?? '', user!.id)
    } catch (e) {
      console.error(e)
      setReply('에러가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const remaining = !isKakaoAuthed ? Math.max(0, MAX_FREE_TRIES - anonTry) : Infinity

  return (
    <div className="p-4 max-w-xl mx-auto mt-4">
      <div className="relative">
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="요즘 육아 고민을 AI 육아코치에게 질문해보세요."
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
        />
        {!isKakaoAuthed && (
          <div className="absolute top-2 right-2 text-[11px] text-gray-400">
            오늘 남은 무료 질문: <span className="font-semibold">{remaining}</span>개
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div />
        <button
          onClick={()=>sendMessage()}
          disabled={loading || !ready}
          className="px-4 py-2 bg-[#3fb1df] text-white text-base rounded hover:opacity-90 disabled:opacity-50"
        >
          {!ready ? '준비 중...' : loading ? '함께 고민 중..' : '질문하기'}
        </button>
      </div>

      {reply && (
        <div className="mt-4 p-4 border rounded bg-[#333333] whitespace-pre-line text-left text-base text-white">
          {reply}
        </div>
      )}

      {/* 로그인 유도 모달 (AI 육아코치 톤) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setShowLoginModal(false)} />
          <div className="relative bg-[#222] text-[#eae3de] rounded-2xl shadow-xl w-[92%] max-w-sm p-5">
            <h3 className="text-lg font-semibold mb-2">카카오톡 로그인</h3>
            <p className="text-sm text-gray-300 mb-4 leading-6">
              로그인하시면 <span className="font-semibold">질문을 무제한</span>으로 사용할 수 있어요.
              지금 로그인할까요?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={()=>setShowLoginModal(false)}
                className="px-4 py-2 rounded-lg bg-[#444] text-white hover:opacity-90"
              >
                나중에
              </button>
              <button
                onClick={handleConfirmLogin}
                className="px-4 py-2 rounded-lg bg-[#3fb1df] text-white hover:opacity-90"
              >
                카카오로 계속하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
