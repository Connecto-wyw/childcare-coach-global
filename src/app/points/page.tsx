'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthUser, useSupabase } from '@/app/providers'

type Tab = 'all' | 'earn' | 'use'

type HistoryItem = {
  id: string
  type: 'earn' | 'use'
  amount: number
  reason: string
  created_at: string
}

function format(n: number) {
  try { return n.toLocaleString('en-US') } catch { return String(n) }
}

function TabBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 py-2.5 text-[13px] font-semibold transition-colors rounded-lg',
        active ? 'bg-white text-[#0e0e0e] shadow-sm' : 'text-[#8a8a8a]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const d = new Date(item.created_at)
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  const isEarn = item.type === 'earn'

  return (
    <div className="flex items-center gap-3 py-4 border-b border-[#f5f5f5] last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isEarn ? 'bg-[#FFF5F0]' : 'bg-[#F5F5F5]'}`}>
        {isEarn ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#9F1D23]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#6b6b6b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 19V5M5 12l7 7 7-7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#0e0e0e] truncate">{item.reason}</p>
        <p className="text-[12px] text-[#b4b4b4] mt-0.5">{dateStr}</p>
      </div>
      <span className={`text-[15px] font-bold shrink-0 ${isEarn ? 'text-[#9F1D23]' : 'text-[#6b6b6b]'}`}>
        {isEarn ? '+' : '-'}{format(item.amount)}P
      </span>
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  const msg = tab === 'use' ? '사용한 포인트 내역이 없어요.' : '아직 포인트 내역이 없어요.'
  return (
    <div className="flex flex-col items-center py-16 gap-3">
      <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#c4c4c4]" fill="currentColor">
          <path d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4Zm0 2c4.42 0 7 .98 7 2s-2.58 2-7 2-7-.98-7-2 2.58-2 7-2Z" />
        </svg>
      </div>
      <p className="text-[14px] text-[#b4b4b4]">{msg}</p>
    </div>
  )
}

const MAX_FREE_POINTS = 3000

const EARN_GUIDE = [
  { icon: '💬', title: 'AI 코치 대화', desc: '1개 질문당 +3P · 매일 최대 30P', badge: '+3P' },
  { icon: '🧠', title: 'KYK 완료', desc: '내 아이 파악하기 완료 (1회 한정)', badge: '+200P' },
  { icon: '📅', title: '출석 체크', desc: '매일 앱 방문 시 적립', badge: '+15P' },
  { icon: '🎉', title: '팀 이벤트 참여', desc: '팀 이벤트 등록 및 참여 시 적립', badge: '+30P' },
  { icon: '✍️', title: '게시글 작성', desc: '팀 게시판에 글 작성 시 적립', badge: '+10P' },
]

export default function PointsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, loading } = useAuthUser()
  const [tab, setTab] = useState<Tab>('all')
  const [points, setPoints] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    const [profileRes, histRes] = await Promise.all([
      supabase.from('profiles').select('points').eq('id', user.id).maybeSingle(),
      (supabase as any).from('points_history')
        .select('id, type, amount, reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    setPoints(Number((profileRes.data as any)?.points ?? 0))
    setHistory(histRes.data ?? [])
    setLoadingData(false)
  }, [supabase, user])

  useEffect(() => {
    if (!user) { if (!loading) setLoadingData(false); return }
    void loadData()

    // 실시간 구독: points_history INSERT 감지
    const channel = (supabase as any)
      .channel(`points-history-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'points_history',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        setHistory((prev) => [payload.new, ...prev])
        setPoints((prev) => prev + payload.new.amount)
      })
      .subscribe()

    return () => { (supabase as any).removeChannel(channel) }
  }, [user, loading, loadData])

  const filtered = tab === 'all' ? history : history.filter((h) => h.type === tab)

  if (loading || loadingData) {
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
      {/* 헤더 */}
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

        <div className="text-center relative z-10">
          <p className="text-[13px] text-white/70 font-medium mb-2">내 포인트</p>
          <div className="flex items-end justify-center gap-2">
            <span className="text-[48px] font-extrabold text-white leading-none tracking-tight">
              {format(points)}
            </span>
            <span className="text-[20px] font-bold text-white/80 mb-1">P</span>
          </div>
        </div>
      </div>

      {/* 탭 카드 */}
      <div className="mx-4 mt-4 mb-4">
        <div className="bg-[#F2F2F2] rounded-xl p-1 flex gap-1">
          <TabBtn active={tab === 'all'} label="전체" onClick={() => setTab('all')} />
          <TabBtn active={tab === 'earn'} label="적립" onClick={() => setTab('earn')} />
          <TabBtn active={tab === 'use'} label="사용" onClick={() => setTab('use')} />
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* 내역 */}
        <div className="bg-white rounded-2xl px-4 shadow-sm">
          {filtered.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            filtered.map((item) => <HistoryRow key={item.id} item={item} />)
          )}
        </div>

        {/* 무료 포인트 한도 프로그레스 */}
        <div>
          <p className="text-[11px] font-bold text-[#8a8a8a] px-1 mb-2 tracking-widest uppercase">무료 적립 현황</p>
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-[20px] font-extrabold text-[#9F1D23]">{format(points)}</span>
                <span className="text-[13px] text-[#8a8a8a] ml-1">/ {format(MAX_FREE_POINTS)}P 무료 한도</span>
              </div>
              <span className="text-[12px] font-semibold text-[#9F1D23]">
                {Math.min(100, Math.round((points / MAX_FREE_POINTS) * 100))}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#9F1D23] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (points / MAX_FREE_POINTS) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-[#b4b4b4]">1P = 1원으로 사용 가능</p>
              <p className="text-[11px] text-[#b4b4b4]">잔여 {format(Math.max(0, MAX_FREE_POINTS - points))}P</p>
            </div>
          </div>
        </div>

        {/* 포인트 적립 가이드 */}
        <div>
          <p className="text-[11px] font-bold text-[#8a8a8a] px-1 mb-2 tracking-widest uppercase">포인트 적립 방법</p>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-[#f5f5f5]">
            {EARN_GUIDE.map((g) => (
              <div key={g.title} className="flex items-center gap-3 px-4 py-3.5">
                <span className="text-[22px] w-10 text-center shrink-0">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#0e0e0e]">{g.title}</p>
                  <p className="text-[12px] text-[#8a8a8a] mt-0.5">{g.desc}</p>
                </div>
                <span className="text-[13px] font-bold text-[#9F1D23] shrink-0">{g.badge}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#c4c4c4] py-2">
          무료 적립 한도 {format(MAX_FREE_POINTS)}P 초과 시 유료 구매로만 적립 가능합니다.
        </p>
      </div>
    </main>
  )
}
