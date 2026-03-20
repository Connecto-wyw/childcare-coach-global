'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n/I18nProvider'

const ANIMAL_IMAGES = [
  'Blue_나비','Blue_늑대','Blue_돌고래','Blue_말','Blue_물고기','Blue_부엉이','Blue_풍뎅이','Blue_호랑이',
  'Green_나비','Green_늑대','Green_돌고래','Green_말','Green_물고기','Green_부엉이','Green_풍뎅이','Green_호랑이',
  'Red_나비','Red_늑대','Red_돌고래','Red_말','Red_물고기','Red_부엉이','Red_풍뎅이','Red_호랑이',
  'Yellow_나비','Yellow_늑대','Yellow_돌고래','Yellow_말','Yellow_물고기','Yellow_부엉이','Yellow_풍뎅이','Yellow_호랑이',
]
const BG_COLORS: Record<string, string> = {
  Blue: '#EAF4FF', Green: '#EAFAF0', Red: '#FFF0F0', Yellow: '#FFFBEA',
}
function getAnimalImage(id: string) {
  const hash = id.replace(/-/g, '').slice(0, 8)
  const idx = parseInt(hash, 16) % ANIMAL_IMAGES.length
  const name = ANIMAL_IMAGES[idx]
  const color = name.split('_')[0]
  return { src: `/animals/${name}.png`, bg: BG_COLORS[color] ?? '#f3f3f3' }
}

type Event = {
  id: string
  title: string
  event_date: string
  event_time: string | null
  purpose: string | null
  fee: string | null
}

type Tab = 'home' | 'events' | 'chat' | 'board'

function EventCard({ ev }: { ev: Event }) {
  const d = new Date(ev.event_date)
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e9e9e9] bg-white">
      <div className="w-10 h-10 rounded-lg bg-[#EAF6FF] flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] font-semibold text-[#3497f3] leading-none">
          {d.toLocaleDateString('ko-KR', { month: 'short' })}
        </span>
        <span className="text-[16px] font-bold text-[#3497f3] leading-tight">{d.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[#0e0e0e] truncate">{ev.title}</div>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {ev.event_time && <span className="text-[12px] text-[#8a8a8a]">{ev.event_time}</span>}
          {ev.fee && <span className="text-[12px] text-[#8a8a8a]">· {ev.fee}</span>}
        </div>
      </div>
    </div>
  )
}

export default function TeamDetailClient({
  teamId,
  teamName,
  events,
}: {
  teamId: string
  teamName: string
  events: Event[]
}) {
  const t = useTranslation('team')
  const [tab, setTab] = useState<Tab>('home')
  const [fabOpen, setFabOpen] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: t('tab_home') },
    { key: 'events', label: t('tab_events') },
    { key: 'chat', label: t('tab_chat') },
    { key: 'board', label: t('tab_board') },
  ]

  const today = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter((e) => e.event_date >= today)
  const { src, bg } = getAnimalImage(teamId)

  return (
    <div className="relative min-h-screen bg-white pb-[120px]">
      {/* 팀 헤더 */}
      <div className="px-4 pt-6 pb-4 border-b border-[#f0f0f0] flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: bg }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-[20px] font-bold text-[#0e0e0e]">{teamName}</h1>
      </div>

      {/* 탭 바 */}
      <div className="flex border-b border-[#f0f0f0] sticky top-0 bg-white z-10">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'flex-1 py-3 text-[14px] font-semibold transition-colors',
              tab === key
                ? 'text-[#3497f3] border-b-2 border-[#3497f3]'
                : 'text-[#8a8a8a]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="px-4 py-6 max-w-5xl">
        {tab === 'home' && (
          <div className="space-y-8">
            {/* 공지사항 */}
            <section>
              <h2 className="text-[15px] font-bold text-[#0e0e0e] mb-3">{t('announcements')}</h2>
              <p className="text-[14px] text-[#b4b4b4]">{t('no_announcements')}</p>
            </section>

            {/* 이벤트 일정 */}
            <section>
              <h2 className="text-[15px] font-bold text-[#0e0e0e] mb-3">{t('event_schedule')}</h2>
              {upcomingEvents.length === 0 ? (
                <p className="text-[14px] text-[#b4b4b4]">{t('no_events')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingEvents.map((ev) => <EventCard key={ev.id} ev={ev} />)}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'events' && (
          <div>
            {events.length === 0 ? (
              <p className="text-[14px] text-[#b4b4b4]">{t('no_events')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {events.map((ev) => <EventCard key={ev.id} ev={ev} />)}
              </div>
            )}
          </div>
        )}

        {(tab === 'chat' || tab === 'board') && (
          <p className="text-[14px] text-[#b4b4b4]">{t('coming_soon')}</p>
        )}
      </div>

      {/* FAB 배경 */}
      {fabOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />
      )}

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            <FabMenuItem label={t('fab_write_announcement')} href={`/teams/${teamId}/announcements/new`} onClose={() => setFabOpen(false)} />
            <FabMenuItem label={t('fab_write_board')} href={`/teams/${teamId}/board/new`} onClose={() => setFabOpen(false)} />
            <FabMenuItem label={t('fab_create_event')} href={`/teams/${teamId}/events/new`} onClose={() => setFabOpen(false)} />
          </>
        )}
        <button
          type="button"
          onClick={() => setFabOpen((v) => !v)}
          className={[
            'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200',
            fabOpen ? 'bg-[#0e0e0e] rotate-45' : 'bg-[#3497f3]',
          ].join(' ')}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function FabMenuItem({ label, href, onClose }: { label: string; href: string; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-md border border-[#e9e9e9] text-[13px] font-semibold text-[#0e0e0e] hover:bg-[#f5f5f5] transition-colors whitespace-nowrap"
    >
      {label}
    </Link>
  )
}
