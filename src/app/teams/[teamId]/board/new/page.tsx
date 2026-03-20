'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/i18n/I18nProvider'
import { useSupabase, useAuthUser } from '@/app/providers'

export default function NewPostPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.teamId as string
  const t = useTranslation('team')
  const supabase = useSupabase()
  const { user } = useAuthUser()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isNotice, setIsNotice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!user || !title.trim() || !content.trim()) return
    setSubmitting(true)
    setError('')
    const { error: dbErr } = await (supabase as any)
      .from('community_team_posts')
      .insert({
        team_id:      teamId,
        author_id:    user.id,
        author_name:  user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Anonymous',
        author_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        title:        title.trim(),
        content:      content.trim(),
        is_notice:    isNotice,
      })
    setSubmitting(false)
    if (dbErr) { setError(t('post_error')); return }
    router.push(`/teams/${teamId}`)
  }

  return (
    <main className="min-h-screen bg-white pb-[80px]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[14px] text-[#8a8a8a] mb-6 hover:text-[#0e0e0e] transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </button>

        <h1 className="text-[22px] font-bold text-[#0e0e0e] mb-6">{t('board_write')}</h1>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('post_title_placeholder')}
            className={[
              'w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-[#3497f3]',
              title ? 'border-[#3497f3]' : 'border-[#e9e9e9]',
            ].join(' ')}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('post_content_placeholder')}
            rows={10}
            className={[
              'w-full px-4 py-3 rounded-xl border text-[14px] leading-relaxed resize-none focus:outline-none focus:border-[#3497f3]',
              content ? 'border-[#3497f3]' : 'border-[#e9e9e9]',
            ].join(' ')}
          />

          {/* 공지 토글 */}
          <button
            type="button"
            onClick={() => setIsNotice((v) => !v)}
            className="flex items-center gap-2 self-start"
          >
            <div className={[
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              isNotice ? 'bg-[#3497f3] border-[#3497f3]' : 'border-[#d9d9d9]',
            ].join(' ')}>
              {isNotice && (
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-[14px] font-medium text-[#0e0e0e]">{t('post_is_notice')}</span>
          </button>
        </div>

        {error && <p className="mt-4 text-[13px] text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          className={[
            'mt-6 w-full py-3 rounded-xl text-[14px] font-semibold transition-colors',
            submitting || !title.trim() || !content.trim()
              ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed'
              : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]',
          ].join(' ')}
        >
          {submitting ? t('post_submitting') : t('post_submit')}
        </button>
      </div>
    </main>
  )
}
