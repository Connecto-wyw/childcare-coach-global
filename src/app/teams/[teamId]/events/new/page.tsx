'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/i18n/I18nProvider'
import { useSupabase, useAuthUser } from '@/app/providers'
import { earnPoints } from '@/lib/earnPoints'

// ── 캘린더 ──────────────────────────────────────────────────────
function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayStr = today.toISOString().split('T')[0]
  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="rounded-2xl border border-[#e9e9e9] p-4">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5]"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <span className="text-[15px] font-bold text-[#0e0e0e]">{year}년 {month + 1}월</span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5]"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={[
              'text-[12px] font-medium text-center py-1',
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#8a8a8a]',
            ].join(' ')}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === value
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const col = idx % 7
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => !isPast && onChange(dateStr)}
              disabled={isPast}
              className={[
                'w-full aspect-square flex items-center justify-center rounded-full text-[13px] font-medium transition-colors',
                isSelected
                  ? 'bg-[#3497f3] text-white font-bold'
                  : isToday
                    ? 'border border-[#3497f3] text-[#3497f3]'
                    : isPast
                      ? 'text-[#d9d9d9] cursor-not-allowed'
                      : col === 0
                        ? 'text-red-400 hover:bg-[#f5f5f5]'
                        : col === 6
                          ? 'text-blue-400 hover:bg-[#f5f5f5]'
                          : 'text-[#0e0e0e] hover:bg-[#f5f5f5]',
              ].join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 메인 ────────────────────────────────────────────────────────
export default function NewEventPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.teamId as string
  const supabase = useSupabase()
  const { user } = useAuthUser()
  const t = useTranslation('team')

  const [step, setStep] = useState(1)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [fee, setFee] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2)
    const m = i % 2 === 0 ? '00' : '30'
    const ampm = h < 12 ? '오전' : '오후'
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${ampm} ${displayH}:${m}`
  })

  const handleCreate = async () => {
    if (!user || !title.trim() || !date) return
    setCreating(true)
    setError('')
    const { error: dbErr } = await (supabase as any)
      .from('community_team_events')
      .insert({
        team_id:    teamId,
        created_by: user.id,
        title:      title.trim(),
        purpose:    purpose.trim() || null,
        fee:        fee.trim() || null,
        event_date: date,
        event_time: time || null,
      })
    setCreating(false)
    if (dbErr) { setError(t('event_error')); return }
    void earnPoints(30, '팀 이벤트 등록')
    router.push(`/teams/${teamId}`)
  }

  return (
    <main className="min-h-screen bg-white pb-[80px]">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* 뒤로가기 */}
        <button
          type="button"
          onClick={() => step === 1 ? router.back() : setStep(1)}
          className="flex items-center gap-1.5 text-[14px] text-[#8a8a8a] mb-6 hover:text-[#0e0e0e] transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back
        </button>

        {/* ── STEP 1: 날짜 + 시간 ── */}
        {step === 1 && (
          <div>
            <h1 className="text-[22px] font-bold text-[#0e0e0e] mb-6">{t('event_step1_title')}</h1>

            <CalendarPicker value={date} onChange={setDate} />

            <div className="mt-5">
              <p className="text-[14px] font-bold text-[#0e0e0e] mb-2">{t('event_time_label')}</p>
              <div className="relative">
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={[
                    'w-full px-4 py-3 rounded-xl border text-[14px] appearance-none bg-white focus:outline-none focus:border-[#3497f3]',
                    time ? 'border-[#3497f3] text-[#0e0e0e]' : 'border-[#e9e9e9] text-[#b4b4b4]',
                  ].join(' ')}
                >
                  <option value="">{t('event_time_placeholder')}</option>
                  {timeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b4b4b4]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6l5 5 5-5" />
                </svg>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!date}
                className={[
                  'flex items-center gap-1.5 px-6 py-3 rounded-xl text-[14px] font-semibold transition-colors',
                  !date ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed' : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]',
                ].join(' ')}
              >
                {t('new_next')}
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 이벤트 정보 ── */}
        {step === 2 && (
          <div>
            <h1 className="text-[22px] font-bold text-[#0e0e0e] mb-6">{t('event_step2_title')}</h1>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[14px] font-bold text-[#0e0e0e] mb-2">{t('event_title_label')}</p>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('event_title_placeholder')}
                  className={[
                    'w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-[#3497f3]',
                    title ? 'border-[#3497f3]' : 'border-[#e9e9e9]',
                  ].join(' ')}
                />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#0e0e0e] mb-2">{t('event_purpose_label')}</p>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t('event_purpose_placeholder')}
                  className={[
                    'w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-[#3497f3]',
                    purpose ? 'border-[#3497f3]' : 'border-[#e9e9e9]',
                  ].join(' ')}
                />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#0e0e0e] mb-2">{t('event_fee_label')}</p>
                <input
                  type="text"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder={t('event_fee_placeholder')}
                  className={[
                    'w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-[#3497f3]',
                    fee ? 'border-[#3497f3]' : 'border-[#e9e9e9]',
                  ].join(' ')}
                />
              </div>
            </div>

            {error && <p className="mt-4 text-[13px] text-red-500">{error}</p>}

            <div className="flex justify-between gap-3 mt-8">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e9e9e9] text-[14px] font-semibold text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 3L5 8l5 5" />
                </svg>
                {t('new_prev')}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className={[
                  'flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-colors',
                  creating || !title.trim()
                    ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed'
                    : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]',
                ].join(' ')}
              >
                {creating ? t('event_creating') : t('event_create_btn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
