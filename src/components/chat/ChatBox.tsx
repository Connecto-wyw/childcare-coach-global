'use client'

import { useState } from 'react'
import { saveChatLog } from '@/lib/saveChatLog' // ✅ Supabase 저장 함수 import

export default function ChatBox() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!message.trim()) return
    setLoading(true)
    setReply('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: '당신은 친절한 육아 전문가입니다.' },
            { role: 'user', content: message },
          ],
        }),
      })

      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      const answer = text || '답변을 가져오지 못했어요.'
      setReply(answer)

      // ✅ Supabase에 질문/답변 저장
      await saveChatLog(message, answer)
    } catch (error) {
      setReply('에러가 발생했어요.')
      console.error('에러:', error)
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

      {/* ✅ 버튼 중앙 정렬을 위한 div 추가 */}
      <div className="flex justify-center mt-2">
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-4 py-2 bg-[#3fb1df] text-bg[#eae3de] text-base rounded disabled:opacity-50"
        >
          {loading ? '함께 고민 중..' : '질문하기'}
        </button>
      </div>

      {reply && (
        <div className="mt-4 p-4 border rounded bg-[#333333] whitespace-pre-line text-left text-base">
          {reply}
        </div>
      )}
    </div>
  )
}
