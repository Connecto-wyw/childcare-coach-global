'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase, useAuthUser } from '@/app/providers'
import { useTranslation } from '@/i18n/I18nProvider'

type Message = {
  id: string
  sender_id: string
  sender_name: string
  sender_avatar: string | null
  content: string
  created_at: string
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) return <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
  return (
    <div className="w-8 h-8 rounded-full bg-[#e9e9e9] flex items-center justify-center shrink-0">
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#b4b4b4]" fill="currentColor">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </svg>
    </div>
  )
}

export default function ChatTab({ teamId }: { teamId: string }) {
  const t = useTranslation('team')
  const supabase = useSupabase()
  const { user } = useAuthUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('community_team_messages')
        .select('id, sender_id, sender_name, sender_avatar, content, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages(data ?? [])
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    }
    load()

    const channel = (supabase as any)
      .channel(`team-chat-${teamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_team_messages',
        filter: `team_id=eq.${teamId}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    return () => { (supabase as any).removeChannel(channel) }
  }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!user || !input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    await (supabase as any).from('community_team_messages').insert({
      team_id:      teamId,
      sender_id:    user.id,
      sender_name:  user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Anonymous',
      sender_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      content,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  // 날짜 구분선
  function dateLabel(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: 300 }}>
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-1">
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-[#b4b4b4] mt-10">{t('chat_empty')}</p>
        )}
        {messages.map((msg, i) => {
          const isMine = user?.id === msg.sender_id
          const showDate = i === 0 || dateLabel(messages[i - 1].created_at) !== dateLabel(msg.created_at)
          const showAvatar = !isMine && (i === 0 || messages[i - 1].sender_id !== msg.sender_id)
          const showName = !isMine && showAvatar
          const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-[11px] text-[#c4c4c4] my-3">{dateLabel(msg.created_at)}</div>
              )}
              <div className={`flex items-end gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                {/* 아바타 (내 메시지 아님 + 첫 메시지일 때만) */}
                <div className="w-8 shrink-0">
                  {showAvatar && <Avatar src={msg.sender_avatar} name={msg.sender_name} />}
                </div>
                <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <span className="text-[11px] text-[#8a8a8a] mb-1 ml-1">{msg.sender_name}</span>
                  )}
                  <div className="flex items-end gap-1.5">
                    {isMine && <span className="text-[10px] text-[#c4c4c4] mb-0.5">{time}</span>}
                    <div className={[
                      'px-3 py-2 text-[14px] leading-relaxed break-words',
                      isMine
                        ? 'bg-[#3497f3] text-white rounded-2xl rounded-br-sm'
                        : 'bg-[#f0f0f0] text-[#0e0e0e] rounded-2xl rounded-bl-sm',
                    ].join(' ')}>
                      {msg.content}
                    </div>
                    {!isMine && <span className="text-[10px] text-[#c4c4c4] mb-0.5">{time}</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-[#f0f0f0] pt-3 flex gap-2 bg-white">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder={t('chat_placeholder')}
          className="flex-1 px-4 py-2.5 rounded-full border border-[#e9e9e9] text-[14px] focus:outline-none focus:border-[#3497f3]"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className={[
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0',
            input.trim() ? 'bg-[#3497f3] text-white' : 'bg-[#e9e9e9] text-[#b4b4b4]',
          ].join(' ')}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
