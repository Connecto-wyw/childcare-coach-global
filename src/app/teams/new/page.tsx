'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── 상수 ──────────────────────────────────────────────────────
const PURPOSES = ['지역 동네 모임', '정보 교류', '친목/소통', '공동 육아', '기타'] as const

const CHILD_GENDER_OPTIONS = ['남자아이', '여자아이', '상관없음']
const CHILD_AGE_OPTIONS = [
  '0세', '1세', '2세', '3세', '4세', '5세', '6세', '7세',
  '8세', '9세', '10세', '11세', '12세', '13세 이상',
]
const PARENT_AGE_OPTIONS = ['20대', '30대 초반', '30대 후반', '40대', '40대 이상']

// ── 타입 ──────────────────────────────────────────────────────
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

const TOTAL_STEPS = 4

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

function RadioRow({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
        checked
          ? 'border-[#3497f3] bg-[#f0f7fd]'
          : 'border-[#e9e9e9] bg-white hover:bg-[#fafafa]',
      ].join(' ')}
    >
      <span
        className={[
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          checked ? 'border-[#3497f3]' : 'border-[#d9d9d9]',
        ].join(' ')}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-[#3497f3]" />}
      </span>
      <span className={`text-[14px] ${checked ? 'font-semibold text-[#3497f3]' : 'font-medium text-[#0e0e0e]'}`}>
        {label}
      </span>
    </button>
  )
}

function CheckChip({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full border text-[13px] font-medium transition-colors',
        checked
          ? 'border-[#3497f3] bg-[#3497f3] text-white'
          : 'border-[#e9e9e9] bg-white text-[#0e0e0e] hover:bg-[#f0f7fd]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'w-full px-4 py-3 rounded-xl border text-[14px] font-medium',
        'appearance-none bg-white',
        'focus:outline-none focus:border-[#3497f3]',
        value ? 'border-[#3497f3] text-[#0e0e0e]' : 'border-[#e9e9e9] text-[#b4b4b4]',
      ].join(' ')}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function NavButtons({
  step,
  onBack,
  onNext,
  nextDisabled,
  isLast,
}: {
  step: number
  onBack: () => void
  onNext: () => void
  nextDisabled?: boolean
  isLast?: boolean
}) {
  return (
    <div className={`flex gap-3 mt-10 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
      {step > 1 && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#e9e9e9] text-[14px] font-semibold text-[#6b6b6b] hover:bg-[#f5f5f5] transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          이전
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={[
          'flex items-center gap-1.5 px-6 py-3 rounded-xl text-[14px] font-semibold transition-colors',
          nextDisabled
            ? 'bg-[#e9e9e9] text-[#b4b4b4] cursor-not-allowed'
            : 'bg-[#3497f3] text-white hover:bg-[#1f7fd4]',
        ].join(' ')}
      >
        {isLast ? '완료' : '다음'}
        {!isLast && (
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function NewTeamPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const togglePurpose = (p: string) =>
    set('purposes', form.purposes.includes(p)
      ? form.purposes.filter((x) => x !== p)
      : [...form.purposes, p])

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
    else router.push('/teams') // TODO: submit
  }
  const goBack = () => setStep((s) => s - 1)

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e] pb-[80px]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* ── STEP 1: 팀 이름 ── */}
        {step === 1 && (
          <div>
            <StepTitle>팀 이름</StepTitle>

            <input
              type="text"
              value={form.teamName}
              onChange={(e) => set('teamName', e.target.value)}
              placeholder="팀 이름을 입력해주세요"
              maxLength={40}
              className={[
                'w-full px-4 py-3 rounded-xl border text-[15px]',
                'focus:outline-none focus:border-[#3497f3]',
                form.teamName ? 'border-[#3497f3]' : 'border-[#e9e9e9]',
              ].join(' ')}
            />

            <p className="mt-4 text-[13px] text-[#8a8a8a]">
              💡 <span className="font-medium">Tip.</span> 검색하기 편한 이름이면 더 좋아요!
            </p>

            <NavButtons
              step={step}
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!form.teamName.trim()}
            />
          </div>
        )}

        {/* ── STEP 2: 팀 형태 ── */}
        {step === 2 && (
          <div>
            <StepTitle>팀 형태</StepTitle>

            {/* 공개 여부 */}
            <div className="mb-6">
              <FieldLabel>공개 여부</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <RadioRow label="공개" checked={form.visibility === 'public'} onClick={() => set('visibility', 'public')} />
                <RadioRow label="비공개" checked={form.visibility === 'private'} onClick={() => set('visibility', 'private')} />
              </div>
            </div>

            {/* 팀원 수 */}
            <div className="mb-6">
              <FieldLabel>팀원 수</FieldLabel>
              <div className="flex flex-col gap-2">
                <RadioRow label="작은 규모 (30명 이하)" checked={form.teamSize === 'small'} onClick={() => set('teamSize', 'small')} />
                <RadioRow label="중간 규모 (50명 이하)" checked={form.teamSize === 'medium'} onClick={() => set('teamSize', 'medium')} />
                <RadioRow label="대규모 (50명 이상)" checked={form.teamSize === 'large'} onClick={() => set('teamSize', 'large')} />
              </div>
            </div>

            {/* 가입 승인 */}
            <div className="mb-6">
              <FieldLabel>가입 승인</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <RadioRow label="승인 필요" checked={form.joinApproval === 'approval'} onClick={() => set('joinApproval', 'approval')} />
                <RadioRow label="자동 가입" checked={form.joinApproval === 'auto'} onClick={() => set('joinApproval', 'auto')} />
              </div>
            </div>

            {/* 팀 목적 */}
            <div className="mb-2">
              <FieldLabel>팀 목적 <span className="text-[12px] font-normal text-[#8a8a8a]">중복 선택 가능</span></FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <CheckChip
                    key={p}
                    label={p}
                    checked={form.purposes.includes(p)}
                    onClick={() => togglePurpose(p)}
                  />
                ))}
              </div>
            </div>

            <NavButtons step={step} onBack={goBack} onNext={goNext} />
          </div>
        )}

        {/* ── STEP 3: 멤버 정보 ── */}
        {step === 3 && (
          <div>
            <StepTitle>멤버 정보</StepTitle>

            <div className="flex flex-col gap-5">
              <div>
                <FieldLabel>자녀 성별</FieldLabel>
                <SelectField
                  value={form.childGender}
                  onChange={(v) => set('childGender', v)}
                  options={CHILD_GENDER_OPTIONS}
                  placeholder="선택해주세요"
                />
              </div>

              <div>
                <FieldLabel>자녀 나이</FieldLabel>
                <SelectField
                  value={form.childAge}
                  onChange={(v) => set('childAge', v)}
                  options={CHILD_AGE_OPTIONS}
                  placeholder="선택해주세요"
                />
              </div>

              <div>
                <FieldLabel>부모 나이</FieldLabel>
                <SelectField
                  value={form.parentAge}
                  onChange={(v) => set('parentAge', v)}
                  options={PARENT_AGE_OPTIONS}
                  placeholder="선택해주세요"
                />
              </div>
            </div>

            <NavButtons step={step} onBack={goBack} onNext={goNext} />
          </div>
        )}

        {/* ── STEP 4: (준비 중) ── */}
        {step === 4 && (
          <div>
            <StepTitle>거의 다 됐어요!</StepTitle>
            <p className="text-[15px] text-[#8a8a8a]">마지막 단계가 곧 준비됩니다.</p>
            <NavButtons step={step} onBack={goBack} onNext={goNext} isLast />
          </div>
        )}
      </div>
    </main>
  )
}
