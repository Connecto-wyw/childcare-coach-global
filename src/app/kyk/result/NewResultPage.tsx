import Link from 'next/link'
import { MBTI_TO_TCI, MBTI_PERCENTAGES } from '@/lib/kykScoring'
import type { MBTIType, TCIScore } from '@/lib/kykScoring'

// TCI 차원 키 목록
const TCI_DIMENSION_KEYS = ['NS', 'HA', 'RD', 'PS', 'SD', 'CO', 'ST'] as const
type TciKey = typeof TCI_DIMENSION_KEYS[number]

// 언어별 TCI 차원 이름
const TCI_NAMES: Record<string, Record<TciKey, string>> = {
  ko: { NS: '새로움추구', HA: '위험회피', RD: '사회적 민감성', PS: '인내력',    SD: '자기지향성',      CO: '협동성',        ST: '자기초월성'       },
  en: { NS: 'Novelty Seeking', HA: 'Harm Avoidance', RD: 'Reward Dependence', PS: 'Persistence', SD: 'Self-Directedness', CO: 'Cooperativeness', ST: 'Self-Transcendence' },
  id: { NS: 'Pencarian Kebaruan', HA: 'Penghindaran Bahaya', RD: 'Ketergantungan Hadiah', PS: 'Ketekunan', SD: 'Pengarahan Diri', CO: 'Koperatif',  ST: 'Transendensi Diri' },
  ms: { NS: 'Pencarian Kebaruan', HA: 'Pengelakan Bahaya',   RD: 'Kebergantungan Hadiah', PS: 'Ketekunan', SD: 'Pengarahan Diri', CO: 'Kerjasama',  ST: 'Transendensi Diri' },
  th: { NS: 'แสวงหาสิ่งใหม่',     HA: 'หลีกเลี่ยงอันตราย',  RD: 'พึ่งพารางวัล',           PS: 'ความอดทน',    SD: 'การชี้นำตนเอง',   CO: 'ความร่วมมือ', ST: 'การเหนือตนเอง'    },
}

// 언어별 레벨 텍스트
const LEVEL_LABELS: Record<string, [string, string, string, string]> = {
  ko: ['낮음',   '보통',    '높음',  '매우 높음'],
  en: ['Low',    'Normal',  'High',  'Very High'],
  id: ['Rendah', 'Normal',  'Tinggi','Sangat Tinggi'],
  ms: ['Rendah', 'Normal',  'Tinggi','Sangat Tinggi'],
  th: ['ต่ำ',    'ปานกลาง', 'สูง',   'สูงมาก'],
}

// TCI 점수 → segments 매핑
const TCI_SCORE_VALUES: Record<TCIScore, { segments: number; levelIdx: number }> = {
  1: { segments: 1, levelIdx: 0 },
  2: { segments: 2, levelIdx: 1 },
  3: { segments: 3, levelIdx: 2 },
  4: { segments: 4, levelIdx: 3 },
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
  name: string
  segments: number
  levelLabel: string
  barColor: string
}

function TCIBarChart({ name, segments, levelLabel, barColor }: TCIBarChartProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      {/* 이름: 2줄 허용, flex-1로 남은 공간 모두 사용 */}
      <span className="flex-1 text-white font-medium text-[12px] leading-[1.35]">
        {name}
      </span>

      {/* 4칸 세그먼트 바 */}
      <div className="flex w-[88px] h-[16px] shrink-0 rounded-sm overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 border-r border-[#111] last:border-r-0 ${
              i <= segments ? barColor : 'bg-[#333]'
            }`}
          />
        ))}
      </div>

      {/* 레벨 텍스트 */}
      <span className="w-[54px] shrink-0 text-right text-gray-400 text-[11px] leading-[1.3]">
        {levelLabel}
      </span>
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
  /** 다국어 사전 (result 영역) */
  dict?: any
  /** 현재 사용자 언어코드 */
  locale?: string
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
  dict = {},
  locale,
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
      darkTone: 'var(--blue-dark, #0f3b75)',
      lightTone: 'var(--blue-light, #2b99cc)',
      textColor: 'text-[#38bdf8]',
      barColor: 'bg-[#2b99cc]'
    },
    Red: {
      darkTone: 'var(--red-dark, #7f1d1d)',
      lightTone: 'var(--red-light, #ef4444)',
      textColor: 'text-[#ef4444]',
      barColor: 'bg-[#ef4444]'
    },
    Green: {
      darkTone: 'var(--green-dark, #064e3b)',
      lightTone: 'var(--green-light, #10b981)',
      textColor: 'text-[#10b981]',
      barColor: 'bg-[#10b981]'
    },
    Yellow: {
      darkTone: 'var(--yellow-dark, #713f12)',
      lightTone: 'var(--yellow-light, #eab308)',
      textColor: 'text-[#facc15]',
      barColor: 'bg-[#eab308]'
    },
    White: {
      darkTone: 'var(--white-dark, #475569)',
      lightTone: 'var(--white-light, #94a3b8)',
      textColor: 'text-white',
      barColor: 'bg-[#94a3b8]'
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
    <main className="min-h-screen bg-[#1c1c1c] text-white">
      {/* ── 헤더: V-shape 배경 + 동물 이미지 + 제목 ─────────────────────────── */}
      <div className="relative overflow-hidden bg-[#151515] pb-10 pt-20 text-center">
        {/* V 자 배경 도형 */}
        <div className="absolute left-0 top-0 w-1/2 h-full opacity-90 origin-top-left -skew-x-[35deg]" style={{ background: theme.darkTone }}></div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-90 origin-top-right skew-x-[35deg]" style={{ background: theme.lightTone }}></div>

        {/* 동물 캐릭터 이미지 (테두리 없음) */}
        <div className="relative z-10 mx-auto mb-6 flex h-40 w-40 items-center justify-center">
          <img 
            src={`/animals/${adjectiveColor}_${fileAnimalName}.png`} 
            alt={`${fullAnimalName} 이미지`} 
            className="h-full w-full object-contain" 
          />
        </div>

        {/* 타이틀 및 요약 (어린이 이름 생략) */}
        <h2 className={`relative z-10 text-[24px] font-bold ${theme.textColor}`}>
          {title ?? '결과를 불러오는 중...'}
        </h2>

        {percentage !== null && (
          <div className="relative z-10 mt-6 text-[16px] font-bold text-white">
            {dict.same_type ?? '같은 유형의 사람'} {percentage}%
          </div>
        )}

        {leadSummary && (
          <div className="relative z-10 mt-3 text-[15px] text-gray-200 leading-relaxed max-w-[280px] mx-auto break-keep">
            {leadSummary.split(',').map((part, i, arr) => (
              <p key={i}>{part}{i < arr.length - 1 ? ',' : ''}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── 본문 ─────────────────────────────────────────────────────────────── */}
      <div className="w-full bg-[#2a2a2a] py-10 px-6">
        {/* ── TCI 기질 프로파일 바 차트 ────────────────────────────────────── */}
        {tciProfile && (
          <div className="max-w-[340px] mx-auto flex flex-col gap-1.5">
            {TCI_DIMENSION_KEYS.map((key) => {
              const score = tciProfile[key] as TCIScore | undefined
              const levelData = score ? TCI_SCORE_VALUES[score] : TCI_SCORE_VALUES[2]
              const lang = locale ?? 'ko'
              const names = TCI_NAMES[lang] ?? TCI_NAMES.ko
              const levels = LEVEL_LABELS[lang] ?? LEVEL_LABELS.ko
              return (
                <TCIBarChart
                  key={key}
                  name={names[key]}
                  segments={levelData.segments}
                  levelLabel={levels[levelData.levelIdx]}
                  barColor={theme.barColor}
                />
              )
            })}
          </div>
        )}

        {/* 키워드 태그 버튼 (최대 4개) */}
        {keywords.length > 0 && (
          <div className="mt-10 flex justify-center flex-wrap gap-2.5">
            {keywords.slice(0, 4).map((kw) => (
              <div
                key={kw}
                className="border border-gray-400 bg-[#222] px-5 py-1.5 text-[15px] font-medium text-gray-200 shadow-sm"
              >
                {kw.replace('#', '')}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-xl px-6 pb-20 pt-10 text-gray-100">
        <p className="text-[16px] leading-[1.7] mb-8 font-medium">
          {leadSummary || dict.preparing_result || '결과가 준비 중입니다.'}
        </p>

        {/* 체크리스트 - 불릿 포인트 스타일 */}
        {checkItems.length > 0 && (
          <ul className="list-disc list-inside space-y-3 text-[15px] text-gray-300">
            {checkItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* ── 액션 버튼 ────────────────────────────────────────────────────── */}
        <div className="mt-12 flex gap-4">
          <Link
            href="/coach"
            className={`flex-1 border border-transparent py-4 text-center text-[16px] font-bold text-white transition-opacity hover:opacity-90 rounded-sm ${theme.barColor}`}
          >
            {dict.coach_consulting ?? 'AI 코치 상담하기'}
          </Link>
          <Link
            href="/kyk/step1?restart=1"
            className="border border-gray-500 bg-transparent px-6 py-4 text-[16px] font-bold text-gray-300 transition-colors hover:text-white rounded-sm"
          >
            {dict.btn_retry ?? '다시 검사'}
          </Link>
        </div>
      </div>
    </main>
  )
}
