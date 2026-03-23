'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthUser, useSupabase } from '@/app/providers'

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#c4c4c4]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  )
}

function MenuItem({
  icon,
  label,
  sublabel,
  href,
  onClick,
  danger,
  badge,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  href?: string
  onClick?: () => void
  danger?: boolean
  badge?: string
}) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-[#FFF0F0]' : 'bg-[#F5F5F5]'}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className={`text-[14px] font-semibold ${danger ? 'text-[#9F1D23]' : 'text-[#0e0e0e]'}`}>{label}</span>
        {sublabel && <p className="text-[12px] text-[#8a8a8a] mt-0.5">{sublabel}</p>}
      </div>
      {badge && (
        <span className="text-[12px] font-semibold text-[#8a8a8a] mr-1">{badge}</span>
      )}
      <ChevronRight />
    </div>
  )

  if (href) return <Link href={href} className="block active:bg-[#f5f5f5] transition-colors">{inner}</Link>
  return <button type="button" onClick={onClick} className="w-full text-left active:bg-[#f5f5f5] transition-colors">{inner}</button>
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f0f0f0] shadow-sm">{children}</div>
}

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-[#FFF0F0] flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#9F1D23]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 className="text-[17px] font-bold text-center text-[#0e0e0e] mb-2">회원탈퇴</h3>
        <p className="text-[13px] text-[#6b6b6b] text-center leading-relaxed mb-6">
          탈퇴 시 모든 데이터(포인트, KYK 결과, 팀 정보)가 영구 삭제되며 복구가 불가합니다.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[#e9e9e9] text-[14px] font-semibold text-[#6b6b6b]">
            취소
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-[#9F1D23] text-white text-[14px] font-bold">
            탈퇴하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, loading } = useAuthUser()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const avatarUrl = useMemo(() => {
    if (!user) return null
    const meta: any = user.user_metadata ?? {}
    return meta.avatar_url || meta.picture || null
  }, [user])

  const displayName = useMemo(() => {
    if (!user) return ''
    const meta: any = user.user_metadata ?? {}
    return meta.full_name || meta.name || ''
  }, [user])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/coach')
  }, [supabase, router])

  const deleteAccount = useCallback(async () => {
    // TODO: call delete account API
    setShowDeleteModal(false)
    await supabase.auth.signOut()
    router.push('/coach')
  }, [supabase, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#9F1D23] border-t-transparent animate-spin" />
      </main>
    )
  }

  if (!user) {
    router.replace('/coach')
    return null
  }

  return (
    <main className="min-h-screen bg-[#F7F7F7] pb-[100px]">
      {/* 상단 헤더 */}
      <div className="relative bg-[#9F1D23] pt-12 pb-8 px-4 overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white/5" />

        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-5 left-4 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-2 relative z-10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover border-2 border-white/30 shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" />
              </svg>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-[16px] font-bold text-white">{displayName || '사용자'}</h1>
            <p className="text-[12px] text-white/70 mt-0.5">{user.email}</p>
          </div>
        </div>
      </div>

      {/* 포인트 카드 */}
      <div className="mx-4 mt-4 mb-4">
        <Link href="/points" className="block">
          <div className="bg-white rounded-xl shadow-md px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF5F0] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#9F1D23]" fill="currentColor">
                  <path d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Zm0 2c4.42 0 7 .98 7 2s-2.58 2-7 2-7-.98-7-2 2.58-2 7-2Zm0 14c-4.42 0-7-.98-7-2v-2.1C6.58 16.02 9.1 16.5 12 16.5s5.42-.48 7-1.6V17c0 1.02-2.58 2-7 2Zm0-4.5c-4.42 0-7-.98-7-2v-2.1C6.58 11.52 9.1 12 12 12s5.42-.48 7-1.6V12.5c0 1.02-2.58 2-7 2Z" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-[#0e0e0e]">내 포인트</span>
            </div>
            <div className="flex items-center gap-1 text-[#9F1D23]">
              <span className="text-[13px] font-semibold">내역 보기</span>
              <ChevronRight />
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 space-y-4">
        {/* 서비스 */}
        <div>
          <p className="text-[11px] font-bold text-[#8a8a8a] px-1 mb-2 tracking-widest uppercase">서비스</p>
          <Section>
            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5 text-[#3497f3]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" /></svg>}
              label="공지사항"
              sublabel="서비스 업데이트 및 공지"
              href="/mypage/notices"
            />
            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5 text-[#3497f3]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>}
              label="고객센터"
              sublabel="문의 및 도움말"
              href="/mypage/support"
            />
          </Section>
        </div>

        {/* 설정 */}
        <div>
          <p className="text-[11px] font-bold text-[#8a8a8a] px-1 mb-2 tracking-widest uppercase">설정</p>
          <Section>
            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5 text-[#6b6b6b]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>}
              label="알림 설정"
              sublabel="푸시 알림 및 마케팅 수신"
              href="/mypage/notifications"
            />
            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5 text-[#6b6b6b]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2.5" /></svg>}
              label="버전 정보"
              badge="v1.0.0"
              href="/mypage/version"
            />
          </Section>
        </div>

        {/* 계정 */}
        <div>
          <p className="text-[11px] font-bold text-[#8a8a8a] px-1 mb-2 tracking-widest uppercase">계정</p>
          <Section>
            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5 text-[#6b6b6b]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>}
              label="로그아웃"
              onClick={signOut}
            />
            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="w-5 h-5 text-[#9F1D23]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>}
              label="회원탈퇴"
              danger
              onClick={() => setShowDeleteModal(true)}
            />
          </Section>
        </div>

        <p className="text-center text-[11px] text-[#c4c4c4] py-2">
          © 2026 인디언밥 · TEAM UP. All rights reserved.
        </p>
      </div>

      {showDeleteModal && (
        <DeleteModal onConfirm={deleteAccount} onCancel={() => setShowDeleteModal(false)} />
      )}
    </main>
  )
}
