import Link from 'next/link'
import { MBTI_TO_TCI, MBTI_PERCENTAGES } from '@/lib/kykScoring'
import type { MBTIType, TCIScore } from '@/lib/kykScoring'

// ─── TCI 차원 정의 ───────────────────────────────────────────────────────────
// key: MBTI_TO_TCI 객체의 실제 키, abbr: 차트 표시 약어, name: 한국어 이름
const TCI_DIMENSIONS: { key: string; abbr: string; name: string }[] = [
  { key: 'NS', abbr: 'NS', name: '새로움추구' },
  { key: 'HA', abbr: 'HA', name: '위험회피' },
  { key: 'RD', abbr: 'RD', name: '사회적 민감성' },
  { key: 'PS', abbr: 'P',  name: '인내력' },
  { key: 'SD', abbr: 'SD', name: '자기지향성' },
  { key: 'CO', abbr: 'CO', name: '협동성' },
  { key: 'ST', abbr: 'ST', name: '자기초월성' },
]

// TCI 점수(1~4) → 레벨 텍스트
const TCI_SCORE_TO_LEVEL: Record<TCIScore, string> = {
  1: '낮음',
  2: '보통',
  3: '높음',
  4: '매우 높음',
}

// 레벨 텍스트 → 채워진 칸 수(0~4)
const LEVEL_TO_SEGMENTS: Record<string, number> = {
  '매우 낮음': 0,
  '낮음':     1,
  '보통':     2,
  '높음':     3,
  '매우 높음': 4,
}

// 동물 이름 → 이모지
const ANIMAL_EMOJI: Record<string, string> = {
  부엉이: '🦉',
  물고기: '🐟',
  나비:   '🦋',
  풍뎅이: '🪲',
  늑대:   '🐺',
  호랑이: '🐯',
  말:    '🐴',
  돌고래: '🐬',
}

// ─── TCIBarChart 컴포넌트 ─────────────────────────────────────────────────────
/**
 * 4칸 세그먼트 바 차트.
 * @param abbr       - 약어 (NS, HA, RD, P, SD, CO, ST)
 * @param name       - 한국어 전체 이름
 * @param segments   - 채워질 칸 수 (0~4)
 * @param levelLabel - 레벨 텍스트 (매우 낮음 ~ 매우 높음)
 */
interface TCIBarChartProps {
  abbr: string
  name: string
  segments: number
  levelLabel: string
}

function TCIBarChart({ abbr, name, segments, levelLabel }: TCIBarChartProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* 약어 */}
      <span className="w-7 shrink-0 text-center text-[11px] font-bold text-blue-400">
        {abbr}
      </span>

      {/* 한국어 이름 */}
      <span className="w-24 shrink-0 text-[11px] text-gray-400">{name}</span>

      {/* 4칸 세그먼트 바 */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={[
              'h-5 w-9 rounded-sm transition-colors',
              i <= segments
                ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                : 'bg-gray-700',
            ].join(' ')}
          />
        ))}
      </div>

      {/* 레벨 텍스트 */}
      <span className="ml-1 text-[11px] text-gray-300">{levelLabel}</span>
    </div>
  )
}

// ─── NewResultPage Props ──────────────────────────────────────────────────────
export interface NewResultPageProps {
  /** 아이 이름 (예: '꾸꾸') */
  childName?: string
  /** MBTI 타입 키 (예: 'INTJ') */
  primaryType?: string
  /** 형용사 1번 문항 결과 색상 */
  adjectiveColor?: string
  /** 동물 한국어 이름 (예: '부엉이') */
  animal?: string
  /** 유형 제목 (예: '냉철한 부엉이형') */
  title?: string
  /** 요약 텍스트 (\\n으로 단락 구분) */
  summary?: string
  /** 키워드 배열 (예: ['#전략', '#분석력']) */
  keywords?: string[]
}

// ─── NewResultPage ───────────────────────────────────────────────────────────
export default function NewResultPage({
  childName = '어린이',
  primaryType,
  adjectiveColor = 'Blue',
  animal,
  title,
  summary,
  keywords = [],
}: NewResultPageProps) {
  const mbtiType = primaryType as MBTIType | undefined
  const tciProfile = mbtiType ? MBTI_TO_TCI[mbtiType] : null
  const percentage = mbtiType ? MBTI_PERCENTAGES[mbtiType] : null
  const emoji = animal ? (ANIMAL_EMOJI[animal] ?? '🦉') : '🦉'

  // 요약 텍스트를 \n으로 분리 → [0] 은 리드 요약, [1+] 는 체크리스트 항목
  const summaryParagraphs = summary
    ? summary.split('\n').filter((p) => p.trim().length > 0)
    : []
  const leadSummary = summaryParagraphs[0] ?? ''
  const checkItems = summaryParagraphs.slice(1)

  const themeVars = {
    Blue: {
      stroke: '#60a5fa', avatarBg: 'bg-blue-900/30 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.25)]',
      textLight: 'text-blue-300', textMain: 'text-blue-400', badgeBg: 'bg-blue-600/20 ring-blue-500/30',
      badgeNum: 'text-blue-200',
      tagLink: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
      checkMark: 'text-blue-400', cardBorder: 'border-blue-900/50',
      typeBadge: 'bg-blue-700/30 text-blue-300', btnPrimary: 'bg-blue-600 hover:bg-blue-500 shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.6)]'
    },
    Red: {
      stroke: '#f87171', avatarBg: 'bg-red-900/30 border-red-500/40 shadow-[0_0_30px_rgba(248,113,113,0.25)]',
      textLight: 'text-red-300', textMain: 'text-red-400', badgeBg: 'bg-red-600/20 ring-red-500/30',
      badgeNum: 'text-red-200', tagLink: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
      checkMark: 'text-red-400', cardBorder: 'border-red-900/50',
      typeBadge: 'bg-red-700/30 text-red-300', btnPrimary: 'bg-red-600 hover:bg-red-500 shadow-[0_4px_14px_rgba(220,38,38,0.4)] hover:shadow-[0_4px_20px_rgba(220,38,38,0.6)]'
    },
    Green: {
      stroke: '#34d399', avatarBg: 'bg-emerald-900/30 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.25)]',
      textLight: 'text-emerald-300', textMain: 'text-emerald-400', badgeBg: 'bg-emerald-600/20 ring-emerald-500/30',
      badgeNum: 'text-emerald-200', tagLink: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
      checkMark: 'text-emerald-400', cardBorder: 'border-emerald-900/50',
      typeBadge: 'bg-emerald-700/30 text-emerald-300', btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_14px_rgba(5,150,105,0.4)] hover:shadow-[0_4px_20px_rgba(5,150,105,0.6)]'
    },
    Yellow: {
      stroke: '#fbbf24', avatarBg: 'bg-amber-900/30 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]',
      textLight: 'text-amber-300', textMain: 'text-amber-400', badgeBg: 'bg-amber-600/20 ring-amber-500/30',
      badgeNum: 'text-amber-200', tagLink: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
      checkMark: 'text-amber-400', cardBorder: 'border-amber-900/50',
      typeBadge: 'bg-amber-700/30 text-amber-300', btnPrimary: 'bg-amber-600 hover:bg-amber-500 shadow-[0_4px_14px_rgba(217,119,6,0.4)] hover:shadow-[0_4px_20px_rgba(217,119,6,0.6)]'
    },
    White: {
      stroke: '#cbd5e1', avatarBg: 'bg-slate-800/50 border-slate-500/40 shadow-[0_0_30px_rgba(148,163,184,0.25)]',
      textLight: 'text-slate-300', textMain: 'text-slate-400', badgeBg: 'bg-slate-600/30 ring-slate-500/30',
      badgeNum: 'text-slate-200', tagLink: 'border-slate-500/40 bg-slate-500/20 text-slate-300 hover:bg-slate-500/30',
      checkMark: 'text-slate-400', cardBorder: 'border-slate-800/80',
      typeBadge: 'bg-slate-700/50 text-slate-300', btnPrimary: 'bg-slate-600 hover:bg-slate-500 shadow-[0_4px_14px_rgba(71,85,105,0.4)] hover:shadow-[0_4px_20px_rgba(71,85,105,0.6)]'
    }
  }

  const theme = themeVars[adjectiveColor as keyof typeof themeVars] || themeVars.Blue
  const fullAnimalName = `${adjectiveColor} ${animal ?? '부엉이'}`

  const MBTI_TO_KOR_ANIMAL: Record<string, string> = {
    INTJ: '부엉이', INTP: '물고기', INFJ: '풍뎅이', INFP: '나비',
    ISTJ: '물고기', ISTP: '부엉이', ISFJ: '나비', ISFP: '풍뎅이',
    ENTJ: '호랑이', ENTP: '늑대', ENFJ: '돌고래', ENFP: '말',
    ESTJ: '늑대', ESTP: '호랑이', ESFJ: '말', ESFP: '돌고래',
  }
  
  const fileAnimalName = primaryType ? MBTI_TO_KOR_ANIMAL[primaryType.toUpperCase()] || '부엉이' : '부엉이'


  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">

      {/* ── 헤더: 삼각형 패턴 + 동물 이미지 + 제목 ─────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0d1f3c] to-[#0a0f1e] pb-10 pt-14 text-center">

        {/* 삼각형(폴리곤) 반복 패턴 SVG */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="kyk-triangles"
              x="0"
              y="0"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <polygon points="24,2 46,46 2,46" fill="none" stroke={theme.stroke} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#kyk-triangles)" />
        </svg>

        {/* 동물 캐릭터 이미지 */}
        <div className={`relative mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 ${theme.avatarBg}`}>
          <img 
            src={`/animals/${adjectiveColor}_${fileAnimalName}.png`} 
            alt={`${fullAnimalName} 이미지`} 
            className="h-full w-full object-cover p-2" 
          />
        </div>

        {/* 아이 이름 대신 형용사+동물만 노출 */}
        <p className={`relative text-[13px] font-medium tracking-widest ${theme.textLight} uppercase`}>
          {fullAnimalName}
        </p>
        <h2 className="relative mt-2 text-[20px] font-bold text-white">
          {title ?? '결과를 불러오는 중...'}
        </h2>

        {/* 유형 비율 뱃지 */}
        {percentage !== null && (
          <div className={`relative mt-4 inline-block rounded-full px-4 py-1 text-[13px] font-medium ${theme.textLight} ${theme.badgeBg} ring-1`}>
            같은 유형의 사람&nbsp;
            <span className={`font-bold ${theme.badgeNum}`}>{percentage}%</span>
          </div>
        )}
      </div>

      {/* ── 본문 ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-xl px-5 pb-16 pt-8">

        {/* 키워드 태그 버튼 (최대 4개) */}
        {keywords.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {keywords.slice(0, 4).map((kw) => (
              <Link
                key={kw}
                href={`/coach?prefill=${encodeURIComponent(kw)}`}
                className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors ${theme.tagLink}`}
              >
                {kw}
              </Link>
            ))}
          </div>
        )}

        {/* 리드 요약 텍스트 */}
        {leadSummary && (
          <p className="text-[14px] leading-relaxed text-gray-300">{leadSummary}</p>
        )}

        {/* 체크리스트 (요약 두 번째 단락 이후) */}
        {checkItems.length > 0 && (
          <ul className="mt-5 space-y-3">
            {checkItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[13px] text-gray-300">
                <span className={`mt-0.5 shrink-0 ${theme.checkMark}`}>✓</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* ── TCI 기질 프로파일 바 차트 ────────────────────────────────────── */}
        {tciProfile && (
          <div className={`mt-8 rounded-2xl border ${theme.cardBorder} bg-[#111827] px-6 py-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-gray-200">기질 프로파일</h3>
              {mbtiType && (
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold tracking-widest ${theme.typeBadge}`}>
                  {mbtiType}
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-800">
              {TCI_DIMENSIONS.map(({ key, abbr, name }) => {
                const score = tciProfile[key] as TCIScore | undefined
                const levelLabel = score ? TCI_SCORE_TO_LEVEL[score] : '보통'
                const segments = LEVEL_TO_SEGMENTS[levelLabel] ?? 2
                return (
                  <TCIBarChart
                    key={key}
                    abbr={abbr}
                    name={name}
                    segments={segments}
                    levelLabel={levelLabel}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── 액션 버튼 ────────────────────────────────────────────────────── */}
        <div className="mt-8 flex gap-3">
          <Link
            href="/coach"
            className={`flex-1 rounded-xl py-3 text-center text-[14px] font-semibold text-white transition-all ${theme.btnPrimary}`}
          >
            AI 코치 상담하기
          </Link>
          <Link
            href="/kyk/step1?restart=1"
            className="rounded-xl border border-gray-700 px-5 py-3 text-[14px] font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
          >
            다시 검사
          </Link>
        </div>
      </div>
    </main>
  )
}
