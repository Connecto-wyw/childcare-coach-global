'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/i18n/I18nProvider'
import { useSupabase, useAuthUser } from '@/app/providers'

type Post = {
  id: string
  title: string
  content: string
  is_notice: boolean
  author_name: string
  author_avatar: string | null
  created_at: string
}

type Comment = {
  id: string
  author_name: string
  author_avatar: string | null
  content: string
  created_at: string
}

function Avatar({ src, name, size = 8 }: { src: string | null; name: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full object-cover shrink-0`
  if (src) return <img src={src} alt={name} className={cls} /> // eslint-disable-line @next/next/no-img-element
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[#e9e9e9] flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#b4b4b4]" fill="currentColor">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </svg>
    </div>
  )
}

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.teamId as string
  const postId = params.postId as string
  const t = useTranslation('team')
  const supabase = useSupabase()
  const { user } = useAuthUser()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: postData }, { data: commentsData }, { count: likes }, likedData] = await Promise.all([
        (supabase as any).from('community_team_posts').select('*').eq('id', postId).single(),
        (supabase as any).from('community_team_post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
        (supabase as any).from('community_team_post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
        user
          ? (supabase as any).from('community_team_post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      setPost(postData)
      setComments(commentsData ?? [])
      setLikeCount(likes ?? 0)
      setLiked(!!likedData.data)
      setLoading(false)
    }
    load()
  }, [postId, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLike = async () => {
    if (!user) return
    if (liked) {
      await (supabase as any).from('community_team_post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      setLiked(false)
      setLikeCount((c) => c - 1)
    } else {
      await (supabase as any).from('community_team_post_likes').insert({ post_id: postId, user_id: user.id })
      setLiked(true)
      setLikeCount((c) => c + 1)
    }
  }

  const submitComment = async () => {
    if (!user || !commentInput.trim()) return
    setSubmittingComment(true)
    setCommentError('')
    const { data, error: dbErr } = await (supabase as any)
      .from('community_team_post_comments')
      .insert({
        post_id:      postId,
        author_id:    user.id,
        author_name:  user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Anonymous',
        author_avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        content:      commentInput.trim(),
      })
      .select()
      .single()
    setSubmittingComment(false)
    if (dbErr) { setCommentError(t('post_comment_error')); return }
    setComments((prev) => [...prev, data])
    setCommentInput('')
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-[#b4b4b4]">...</div>
  if (!post) return null

  const d = new Date(post.created_at)
  const dateStr = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  return (
    <main className="min-h-screen bg-white pb-[100px]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 뒤로가기 */}
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

        {/* 제목 */}
        <div className="flex items-center gap-2 mb-3">
          {post.is_notice && (
            <span className="shrink-0 rounded px-1.5 py-0.5 bg-[#3497f3] text-white text-[11px] font-bold leading-none">
              {t('board_notice_badge')}
            </span>
          )}
          <h1 className="text-[20px] font-bold text-[#0e0e0e] leading-snug">{post.title}</h1>
        </div>

        {/* 작성자 + 날짜 */}
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#f0f0f0]">
          <Avatar src={post.author_avatar} name={post.author_name} size={8} />
          <span className="text-[13px] font-medium text-[#6b6b6b]">{post.author_name}</span>
          <span className="text-[12px] text-[#c4c4c4]">{dateStr}</span>
        </div>

        {/* 본문 */}
        <div className="text-[15px] text-[#0e0e0e] leading-relaxed whitespace-pre-wrap mb-8">
          {post.content}
        </div>

        {/* 좋아요 */}
        <div className="flex items-center gap-2 pb-6 border-b border-[#f0f0f0]">
          <button
            type="button"
            onClick={toggleLike}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-semibold transition-colors',
              liked
                ? 'bg-red-50 border-red-300 text-red-500'
                : 'bg-white border-[#e9e9e9] text-[#6b6b6b] hover:bg-[#f5f5f5]',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {t('post_like')} {likeCount > 0 && <span>{likeCount}</span>}
          </button>
        </div>

        {/* 댓글 섹션 */}
        <div className="mt-6">
          <h2 className="text-[15px] font-bold text-[#0e0e0e] mb-4">
            {t('board_comments').replace('{count}', String(comments.length))}
          </h2>

          {comments.length === 0 ? (
            <p className="text-[14px] text-[#b4b4b4] mb-6">{t('post_no_comments')}</p>
          ) : (
            <div className="flex flex-col gap-4 mb-6">
              {comments.map((c) => {
                const cd = new Date(c.created_at)
                const cDate = `${cd.getMonth() + 1}/${cd.getDate()} ${String(cd.getHours()).padStart(2, '0')}:${String(cd.getMinutes()).padStart(2, '0')}`
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar src={c.author_avatar} name={c.author_name} size={8} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-[#0e0e0e]">{c.author_name}</span>
                        <span className="text-[11px] text-[#c4c4c4]">{cDate}</span>
                      </div>
                      <p className="text-[14px] text-[#0e0e0e] leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 댓글 입력 */}
          {commentError && <p className="text-[12px] text-red-500 mb-2">{commentError}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitComment() }}
              placeholder={t('post_comment_placeholder')}
              className="flex-1 px-4 py-2.5 rounded-full border border-[#e9e9e9] text-[14px] focus:outline-none focus:border-[#3497f3]"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={submittingComment || !commentInput.trim()}
              className={[
                'px-4 py-2.5 rounded-full text-[13px] font-semibold transition-colors shrink-0',
                commentInput.trim() ? 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]' : 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed',
              ].join(' ')}
            >
              {t('post_comment_submit')}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
