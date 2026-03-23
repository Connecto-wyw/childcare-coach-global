'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/app/providers'
import { useTranslation } from '@/i18n/I18nProvider'

type Post = {
  id: string
  title: string
  content: string
  is_notice: boolean
  author_id: string
  author_name: string
  author_avatar: string | null
  created_at: string
  likes_count: number
  comments_count: number
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 16 10" className="w-3 h-2" fill="#FFD700" stroke="#E6A800" strokeWidth="0.5" strokeLinejoin="round">
      <path d="M1 9 L2.5 3 L5.5 6.5 L8 1 L10.5 6.5 L13.5 3 L15 9 Z" />
    </svg>
  )
}

function Avatar({ src, name, isOwner }: { src: string | null; name: string; isOwner?: boolean }) {
  return (
    <div className="relative shrink-0 w-7">
      {isOwner && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <CrownIcon />
        </span>
      )}
      {src
        ? <img src={src} alt={name} className="w-7 h-7 rounded-full object-cover" />
        : (
          <div className="w-7 h-7 rounded-full bg-[#e9e9e9] flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#b4b4b4]" fill="currentColor">
              <circle cx="8" cy="5" r="3" />
              <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
            </svg>
          </div>
        )
      }
    </div>
  )
}

function PostCard({ post, teamId, ownerId, t }: { post: Post; teamId: string; ownerId: string; t: (k: string) => string }) {
  const d = new Date(post.created_at)
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const preview = post.content.replace(/\n/g, ' ')

  return (
    <Link href={`/teams/${teamId}/board/${post.id}`} className="block py-4 px-1 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Avatar src={post.author_avatar} name={post.author_name} isOwner={post.author_id === ownerId} />
        <span className="text-[12px] font-medium text-[#6b6b6b]">{post.author_name}</span>
        <span className="text-[12px] text-[#c4c4c4]">{dateStr}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        {post.is_notice && (
          <span className="shrink-0 rounded px-1.5 py-0.5 bg-[#3497f3] text-white text-[11px] font-bold leading-none">
            {t('board_notice_badge')}
          </span>
        )}
        <span className="text-[14px] font-semibold text-[#0e0e0e] line-clamp-1">{post.title}</span>
      </div>
      {preview && (
        <p className="text-[13px] text-[#6b6b6b] line-clamp-2 leading-relaxed mb-2">{preview}</p>
      )}
      <div className="flex gap-3">
        <span className="text-[12px] text-[#b4b4b4]">❤️ {post.likes_count}</span>
        <span className="text-[12px] text-[#b4b4b4]">💬 {post.comments_count}</span>
      </div>
    </Link>
  )
}

export default function BoardTab({ teamId, ownerId }: { teamId: string; ownerId: string }) {
  const t = useTranslation('team')
  const supabase = useSupabase()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from('community_team_posts')
        .select('id, title, content, is_notice, author_id, author_name, author_avatar, created_at')
        .eq('team_id', teamId)
        .order('is_notice', { ascending: false })
        .order('created_at', { ascending: false })

      if (!data) { setLoading(false); return }

      const withCounts = await Promise.all(
        data.map(async (post: any) => {
          const [{ count: likes }, { count: comments }] = await Promise.all([
            (supabase as any).from('community_team_post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            (supabase as any).from('community_team_post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
          ])
          return { ...post, likes_count: likes ?? 0, comments_count: comments ?? 0 }
        })
      )
      setPosts(withCounts)
      setLoading(false)
    }
    load()
  }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="py-10 text-center text-[#b4b4b4] text-[14px]">...</div>
  if (posts.length === 0) return <p className="text-[14px] text-[#b4b4b4] py-4">{t('board_empty')}</p>

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} teamId={teamId} ownerId={ownerId} t={t} />
      ))}
    </div>
  )
}
