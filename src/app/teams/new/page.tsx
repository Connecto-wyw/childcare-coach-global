'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/I18nProvider'
import { useSupabase, useAuthUser } from '@/app/providers'

const TOTAL_STEPS = 4

type FormData = {
  teamName: string
  visibility: 'public' | 'private'
  teamSize: 'small' | 'medium' | 'large'
  joinApproval: 'approval' | 'auto'
  purposes: string[]
  childGender: string
  childAge: string
  parentAge: string
}

const INITIAL: FormData = {
  teamName: '',
  visibility: 'public',
  teamSize: 'small',
  joinApproval: 'auto',
  purposes: [],
  childGender: '',
  childAge: '',
  parentAge: '',
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={['rounded-full transition-all duration-200', i + 1 === current ? 'w-6 h-2 bg-[#3497f3]' : i + 1 < current ? 'w-2 h-2 bg-[#3497f3] opacity-40' : 'w-2 h-2 bg-[#d9d9d9]'].join(' ')} />
      ))}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] font-bold text-[#0e0e0e] mb-3">{children}</p>
}

function RadioRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={['w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors', checked ? 'border-[#3497f3] bg-[#f0f7fd]' : 'border-[#e9e9e9] bg-white hover:bg-[#fafafa]'].join(' ')}>
      <span className={['w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', checked ? 'border-[#3497f3]' : 'border-[#d9d9d9]'].join(' ')}>
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-[#3497f3]" />}
      </span>
      <span className={`text-[14px] ${checked ? 'font-semibold text-[#3497f3]' : 'font-medium text-[#0e0e0e]'}`}>{label}</span>
    </button>
  )
}

function CheckChip({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={['px-4 py-2 rounded-full border text-[13px] font-medium transition-colors', checked ? 'border-[#3497f3] bg-[#3497f3] text-white' : 'border-[#e9e9e9] bg-white text-[#0e0e0e] hover:bg-[#f0f7fd]'].join(' ')}>
      {label}
    </button>
  )
}

function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={['w-full px-4 py-3 rounded-xl border text-[14px] font-medium appearance-none bg-white focus:outline-none focus:border-[#3497f3]', value ? 'border-[#3497f3] text-[#0e0e0e]' : 'border-[#e9e9e9] text-[#b4b4b4]'].join(' ')}>
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-3 border-b border-[#f0f0f0] last:border-0">
      <span className="text-[13px] text-[#8a8a8a] w-24 shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-[#0e0e0e]">{value || '—'}</span>
    </div>
  )
}

function SuccessModal({ title, body, confirmLabel, onConfirm }: { title: string; body: string; confirmLabel: string; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onConfirm} />
      <div className="relative bg-white rounded-2xl px-6 py-8 max-w-sm w-full text-center shadow-xl">
        <div className="text-[40px] mb-4">🎉</div>
        <h2 className="text-[18px] font-bold text-[#0e0e0e] mb-3">{title}</h2>
        <p className="text-[14px] text-[#6b6b6b] leading-relaxed mb-6">{body}</p>
        <button type="button" onClick={onConfirm} className="w-full py-3 rounded-xl bg-[#3497f3] text-white text-[14px] font-semibold hover:bg-[#1f7fd4] transition-colors">
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function NewTeamPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuthUser()
  const t = useTranslation('team')

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const autoSubmitDone = useRef(false)

  // 로그인 후 복귀 시 저장된 폼 데이터로 자동 생성
  useEffect(() => {
    if (!user || autoSubmitDone.current) return
    const raw = localStorage.getItem('teams_new_draft')
    if (!raw) return
    try {
      const { form: savedForm } = JSON.parse(raw)
      autoSubmitDone.current = true
      localStorage.removeItem('teams_new_draft')
      setForm(savedForm)
      setStep(4)
      // 폼 상태 업데이트 후 자동 submit
      setTimeout(async () => {
        setCreating(true)
        setError('')
        const { error: dbErr } = await (supabase as any)
          .from('community_teams')
          .insert({
            owner_id:      user.id,
            name:          savedForm.teamName.trim(),
            visibility:    savedForm.visibility,
            team_size:     savedForm.teamSize,
            join_approval: savedForm.joinApproval,
            purposes:      savedForm.purposes,
            child_gender:  savedForm.childGender || null,
            child_age:     savedForm.childAge || null,
            parent_age:    savedForm.parentAge || null,
          })
        setCreating(false)
        if (dbErr) { setError(t('new_error')); return }
        setShowModal(true)
      }, 100)
    } catch {
      localStorage.removeItem('teams_new_draft')
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const togglePurpose = (p: string) =>
    set('purposes', form.purposes.includes(p) ? form.purposes.filter((x) => x !== p) : [...form.purposes, p])

  const goNext = () => { if (step < TOTAL_STEPS) setStep((s) => s + 1) }
  const goBack = () => { setError(''); setStep((s) => s - 1) }

  const handleCreate = async () => {
    if (!user) {
      localStorage.setItem('teams_new_draft', JSON.stringify({ form }))
      document.cookie = 'kyk_auth_return=/teams/new; path=/; max-age=300; SameSite=Lax'
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString(), queryParams: { prompt: 'select_account' } },
      })
      return
    }
    setCreating(true)
    setError('')
    const { error: dbErr } = await (supabase as any)
      .from('community_teams')
      .insert({
        owner_id:     user.id,
        name:         form.teamName.trim(),
        visibility:   form.visibility,
        team_size:    form.teamSize,
        join_approval: form.joinApproval,
        purposes:     form.purposes,
        child_gender: form.childGender || null,
        child_age:    form.childAge || null,
        parent_age:   form.parentAge || null,
      })
    setCreating(false)
    if (dbErr) { setError(t('new_error')); return }
    setShowModal(true)
  }

  const childAgeOptions = [...Array.from({ length: 13 }, (_, i) => `${i}${t('new_age_suffix')}`), t('new_age_13plus')]
  const parentAgeOptions = [t('new_parent_20s'), t('new_parent_30s_early'), t('new_parent_30s_late'), t('new_parent_40s'), t('new_parent_40s_plus')]
  const purposeKeys = ['new_purpose_local', 'new_purpose_info', 'new_purpose_social', 'new_purpose_coparent', 'new_purpose_other'] as const

  const navProps = { step, onBack: goBack, prevLabel: t('new_prev'), nextLabel: t('new_next') }

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-[80px]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* ── STEP 1: 팀 이름 ── */}
        {step === 1 && (
          <div>
            <h1 className="text-[26px] font-bold text-[#0e0e0e] mb-8">{t('new_step1_title')}</h1>
            <input
              type="text"
              value={form.teamName}
              onChange={(e) => set('teamName', e.target.value)}
              placeholder={t('new_name_placeholder')}
              maxLength={40}
              className={['w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-[#3497f3]', form.teamName ? 'border-[#3497f3]' : 'border-[#e9e9e9]'].join(' ')}
            />
            <p className="mt-4 text-[13px] text-[#8a8a8a]">💡 {t('new_tip')}</p>
            <div className="flex justify-end mt-10">
              <NextBtn label={t('new_next')} onClick={() => setStep(2)} disabled={!form.teamName.trim()} />
            </div>
          </div>
        )}

        {/* ── STEP 2: 팀 형태 ── */}
        {step === 2 && (
          <div>
            <h1 className="text-[26px] font-bold text-[#0e0e0e] mb-8">{t('new_step2_title')}</h1>

            <div className="mb-6">
              <FieldLabel>{t('new_visibility')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <RadioRow label={t('new_public')} checked={form.visibility === 'public'} onClick={() => set('visibility', 'public')} />
                <RadioRow label={t('new_private')} checked={form.visibility === 'private'} onClick={() => set('visibility', 'private')} />
              </div>
            </div>

            <div className="mb-6">
              <FieldLabel>{t('new_size')}</FieldLabel>
              <div className="flex flex-col gap-2">
                <RadioRow label={t('new_size_small')} checked={form.teamSize === 'small'} onClick={() => set('teamSize', 'small')} />
                <RadioRow label={t('new_size_medium')} checked={form.teamSize === 'medium'} onClick={() => set('teamSize', 'medium')} />
                <RadioRow label={t('new_size_large')} checked={form.teamSize === 'large'} onClick={() => set('teamSize', 'large')} />
              </div>
            </div>

            <div className="mb-6">
              <FieldLabel>{t('new_approval')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <RadioRow label={t('new_approval_required')} checked={form.joinApproval === 'approval'} onClick={() => set('joinApproval', 'approval')} />
                <RadioRow label={t('new_approval_auto')} checked={form.joinApproval === 'auto'} onClick={() => set('joinApproval', 'auto')} />
              </div>
            </div>

            <div className="mb-2">
              <FieldLabel>{t('new_purpose')} <span className="text-[12px] font-normal text-[#8a8a8a]">{t('new_multi_select')}</span></FieldLabel>
              <div className="flex flex-wrap gap-2">
                {purposeKeys.map((key) => { const label = t(key); return <CheckChip key={key} label={label} checked={form.purposes.includes(label)} onClick={() => togglePurpose(label)} /> })}
              </div>
            </div>

            <NavRow {...navProps} onNext={() => setStep(3)} />
          </div>
        )}

        {/* ── STEP 3: 멤버 정보 ── */}
        {step === 3 && (
          <div>
            <h1 className="text-[26px] font-bold text-[#0e0e0e] mb-8">{t('new_step3_title')}</h1>
            <div className="flex flex-col gap-5">
              <div>
                <FieldLabel>{t('new_child_gender')}</FieldLabel>
                <SelectField value={form.childGender} onChange={(v) => set('childGender', v)} options={[t('new_gender_boy'), t('new_gender_girl'), t('new_gender_any')]} placeholder={t('new_select_placeholder')} />
              </div>
              <div>
                <FieldLabel>{t('new_child_age')}</FieldLabel>
                <SelectField value={form.childAge} onChange={(v) => set('childAge', v)} options={childAgeOptions} placeholder={t('new_select_placeholder')} />
              </div>
              <div>
                <FieldLabel>{t('new_parent_age')}</FieldLabel>
                <SelectField value={form.parentAge} onChange={(v) => set('parentAge', v)} options={parentAgeOptions} placeholder={t('new_select_placeholder')} />
              </div>
            </div>
            <NavRow {...navProps} onNext={() => setStep(4)} />
          </div>
        )}

        {/* ── STEP 4: 확인 + 팀 생성하기 ── */}
        {step === 4 && (
          <div>
            <h1 className="text-[26px] font-bold text-[#0e0e0e] mb-2">{t('new_step4_title')}</h1>
            <p className="text-[14px] text-[#8a8a8a] mb-8">{t('new_step4_subtitle')}</p>

            <div className="rounded-2xl border border-[#e9e9e9] px-4 py-2 mb-6">
              <SummaryRow label={t('new_summary_name')} value={form.teamName} />
              <SummaryRow label={t('new_summary_visibility')} value={form.visibility === 'public' ? t('new_public') : t('new_private')} />
              <SummaryRow label={t('new_summary_size')} value={form.teamSize === 'small' ? t('new_size_small') : form.teamSize === 'medium' ? t('new_size_medium') : t('new_size_large')} />
              <SummaryRow label={t('new_summary_approval')} value={form.joinApproval === 'approval' ? t('new_approval_required') : t('new_approval_auto')} />
              <SummaryRow label={t('new_summary_purposes')} value={form.purposes.join(', ')} />
              <SummaryRow label={t('new_child_gender')} value={form.childGender} />
              <SummaryRow label={t('new_child_age')} value={form.childAge} />
              <SummaryRow label={t('new_parent_age')} value={form.parentAge} />
            </div>

            {error && <p className="mb-4 text-[13px] text-red-500">{error}</p>}

            <div className="flex justify-between gap-3">
              <button type="button" onClick={goBack} className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e9e9e9] text-[14px] font-semibold text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
                {t('new_prev')}
              </button>
              <button type="button" onClick={handleCreate} disabled={creating} className={['flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-colors', creating ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed' : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]'].join(' ')}>
                {creating ? t('new_creating') : t('new_create_btn')}
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <SuccessModal
          title={t('new_modal_title')}
          body={t('new_modal_body')}
          confirmLabel={t('new_modal_confirm')}
          onConfirm={() => router.push('/teams')}
        />
      )}
    </main>
  )
}

// ── 공통 버튼 헬퍼 ────────────────────────────────────────────
function NextBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={['flex items-center gap-1.5 px-6 py-3 rounded-xl text-[14px] font-semibold transition-colors', disabled ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed' : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]'].join(' ')}>
      {label}
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3l5 5-5 5" /></svg>
    </button>
  )
}

function NavRow({ step, onBack, onNext, prevLabel, nextLabel }: { step: number; onBack: () => void; onNext: () => void; prevLabel: string; nextLabel: string }) {
  return (
    <div className="flex justify-between gap-3 mt-10">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e9e9e9] text-[14px] font-semibold text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
        {prevLabel}
      </button>
      <NextBtn label={nextLabel} onClick={onNext} />
    </div>
  )
}
