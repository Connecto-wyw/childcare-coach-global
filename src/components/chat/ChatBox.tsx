'use client'

import { useState, useEffect } from 'react'
import { saveChatLog } from '@/lib/saveChatLog'
import { useUser } from '@supabase/auth-helpers-react'

type ChatBoxProps = {
  systemPrompt?: string
}

export default function ChatBox({ systemPrompt }: ChatBoxProps) {
  const user = useUser()
  console.log('💡 user_id in ChatBox:', user?.id)

  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false) // GPT 호출 가능 여부

  // 1.5초 지연 후 활성화
  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const sendMessage = async () => {
    if (!message.trim()) return
    if (!ready) {
      setReply('잠시만 기다려 주세요. 설문 데이터 동기화 중입니다.')
      return
    }

    if (!user?.id) {
      console.warn('❗ 유저 정보가 아직 준비되지 않았습니다. 로그인 확인 필요.')
      setReply('로그인 후에 질문하실 수 있어요.')
      return
    }

    setLoading(true)
    setReply('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          messages: [
            {
              role: 'system',
              content:
                systemPrompt ||
                '당신은 친절하지만 현실적인 육아 전문가입니다. 정확하고 신중하게 답변하세요.',
            },
            {
              role: 'user',
              content: message,
            },
          ],
        }),
      })

      const data = await res.json()
      const answer = data?.reply || '답변을 가져오지 못했어요.'
      setReply(answer)

      await saveChatLog(message, answer, user.id)
    } catch (error) {
      console.error('에러:', error)
      setReply('에러가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto mt-4">
      <textarea
        className="w-full p-2 border rounded"
        rows={4}
        placeholder="요즘 육아 고민을 AI 육아코치에게 질문해보세요."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="flex justify-center mt-2">
        <button
          onClick={sendMessage}
          disabled={loading || !ready}
          className="px-4 py-2 bg-[#3fb1df] text-white text-base rounded disabled:opacity-50"
        >
          {!ready
            ? '준비 중...'
            : loading
            ? '함께 고민 중..'
            : '질문하기'}
        </button>
      </div>

      {reply && (
        <div className="mt-4 p-4 border rounded bg-[#333333] whitespace-pre-line text-left text-base text-white">
          {reply}
        </div>
      )}
    </div>
  )
}
