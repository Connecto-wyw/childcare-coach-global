'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/I18nProvider'

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
        <div
          key={i}
          className={[
            'rounded-full transition-all duration-200',
            i + 1 === current
              ? 'w-6 h-2 bg-[#3497f3]'
              : i + 1 < current
              ? 'w-2 h-2 bg-[#3497f3] opacity-40'
              : 'w-2 h-2 bg-[#d9d9d9]',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[26px] font-bold text-[#0e0e0e] mb-8">{children}</h1>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] font-bold text-[#0e0e0e] mb-3">{children}</p>
}

function RadioRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
        checked ? 'border-[#3497f3] bg-[#f0f7fd]' : 'border-[#e9e9e9] bg-white hover:bg-[#fafafa]',
      ].join(' ')}
    >
      <span className={['w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', checked ? 'border-[#3497f3]' : 'border-[#d9d9d9]'].join(' ')}>
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-[#3497f3]" />}
      </span>
      <span className={`text-[14px] ${checked ? 'font-semibold text-[#3497f3]' : 'font-medium text-[#0e0e0e]'}`}>
        {label}
      </span>
    </button>
  )
}

function CheckChip({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full border text-[13px] font-medium transition-colors',
        checked ? 'border-[#3497f3] bg-[#3497f3] text-white' : 'border-[#e9e9e9] bg-white text-[#0e0e0e] hover:bg-[#f0f7fd]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'w-full px-4 py-3 rounded-xl border text-[14px] font-medium appearance-none bg-white',
        'focus:outline-none focus:border-[#3497f3]',
        value ? 'border-[#3497f3] text-[#0e0e0e]' : 'border-[#e9e9e9] text-[#b4b4b4]',
      ].join(' ')}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function NavButtons({ step, onBack, onNext, nextDisabled, isLast, prevLabel, nextLabel, doneLabel }: {
  step: number; onBack: () => void; onNext: () => void
  nextDisabled?: boolean; isLast?: boolean
  prevLabel: string; nextLabel: string; doneLabel: string
}) {
  return (
    <div className={`flex gap-3 mt-10 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
      {step > 1 && (
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e9e9e9] text-[14px] font-semibold text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
          {prevLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={['flex items-center gap-1.5 px-6 py-3 rounded-xl text-[14px] font-semibold transition-colors', nextDisabled ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed' : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]'].join(' ')}
      >
        {isLast ? doneLabel : nextLabel}
        {!isLast && <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3l5 5-5 5" /></svg>}
      </button>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function NewTeamPage() {
  const router = useRouter()
  const t = useTranslation('team')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const togglePurpose = (p: string) =>
    set('purposes', form.purposes.includes(p) ? form.purposes.filter((x) => x !== p) : [...form.purposes, p])

  const goNext = () => { if (step < TOTAL_STEPS) setStep((s) => s + 1); else router.push('/teams') }
  const goBack = () => setStep((s) => s - 1)

  // 자녀 나이 옵션 생성
  const childAgeOptions = [
    ...Array.from({ length: 13 }, (_, i) => `${i}${t('new_age_suffix')}`),
    t('new_age_13plus'),
  ]
  const parentAgeOptions = [t('new_parent_20s'), t('new_parent_30s_early'), t('new_parent_30s_late'), t('new_parent_40s'), t('new_parent_40s_plus')]
  const purposeKeys = ['new_purpose_local', 'new_purpose_info', 'new_purpose_social', 'new_purpose_coparent', 'new_purpose_other'] as const

  const navProps = { step, onBack: goBack, onNext: goNext, prevLabel: t('new_prev'), nextLabel: t('new_next'), doneLabel: t('new_done') }

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-[80px]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* ── STEP 1: 팀 이름 ── */}
        {step === 1 && (
          <div>
            <StepTitle>{t('new_step1_title')}</StepTitle>
            <input
              type="text"
              value={form.teamName}
              onChange={(e) => set('teamName', e.target.value)}
              placeholder={t('new_name_placeholder')}
              maxLength={40}
              className={['w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:border-[#3497f3]', form.teamName ? 'border-[#3497f3]' : 'border-[#e9e9e9]'].join(' ')}
            />
            <p className="mt-4 text-[13px] text-[#8a8a8a]">💡 {t('new_tip')}</p>
            <NavButtons {...navProps} nextDisabled={!form.teamName.trim()} />
          </div>
        )}

        {/* ── STEP 2: 팀 형태 ── */}
        {step === 2 && (
          <div>
            <StepTitle>{t('new_step2_title')}</StepTitle>

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
              <FieldLabel>
                {t('new_purpose')}{' '}
                <span className="text-[12px] font-normal text-[#8a8a8a]">{t('new_multi_select')}</span>
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                {purposeKeys.map((key) => {
                  const label = t(key)
                  return <CheckChip key={key} label={label} checked={form.purposes.includes(label)} onClick={() => togglePurpose(label)} />
                })}
              </div>
            </div>

            <NavButtons {...navProps} />
          </div>
        )}

        {/* ── STEP 3: 멤버 정보 ── */}
        {step === 3 && (
          <div>
            <StepTitle>{t('new_step3_title')}</StepTitle>
            <div className="flex flex-col gap-5">
              <div>
                <FieldLabel>{t('new_child_gender')}</FieldLabel>
                <SelectField
                  value={form.childGender}
                  onChange={(v) => set('childGender', v)}
                  options={[t('new_gender_boy'), t('new_gender_girl'), t('new_gender_any')]}
                  placeholder={t('new_select_placeholder')}
                />
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
            <NavButtons {...navProps} />
          </div>
        )}

        {/* ── STEP 4: 준비 중 ── */}
        {step === 4 && (
          <div>
            <StepTitle>{t('new_step4_title')}</StepTitle>
            <p className="text-[15px] text-[#8a8a8a]">{t('new_step4_subtitle')}</p>
            <NavButtons {...navProps} isLast />
          </div>
        )}
      </div>
    </main>
  )
}
