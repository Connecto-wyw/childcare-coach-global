import type { KYKAnswers } from './kykQuestions'

const DEFAULT_ANSWERS: KYKAnswers = {
  q1_adjectives: [],
  likert: {},
}

export function loadLocalAnswers(): KYKAnswers {
  // 임시로 localStorage에도 같이 저장해서 새로고침해도 안 날아가게(초보 안정성)
  // 최종 소스는 draft DB지만, UX 안전장치로 둔다.
  if (typeof window === 'undefined') return DEFAULT_ANSWERS
  try {
    const raw = localStorage.getItem('kyk_answers')
    if (!raw) return DEFAULT_ANSWERS
    const parsed = JSON.parse(raw)
    
    let { q1_adjectives, likert } = parsed

    q1_adjectives = Array.isArray(q1_adjectives) ? q1_adjectives : []
    likert = typeof likert === 'object' && likert ? likert : {}

    const LEGACY_MAP: Record<string, string> = {
      '차분한': 'adj_1', '똑똑한': 'adj_2', '유연한': 'adj_3', '상상력이 풍부한': 'adj_4', '꼼꼼한': 'adj_5',
      '세심한': 'adj_6', '똑 부러진': 'adj_7', '요령있는': 'adj_8', '말재주 있는': 'adj_9', '의젓한': 'adj_10',
      '친구 많은': 'adj_11', '에너지넘치는': 'adj_12', '겁 없는': 'adj_13', '밝은': 'adj_14', '긍정 뿜뿜': 'adj_15',
      '호기심 많은': 'adj_16', '착한마음씨': 'adj_17', '듬직한': 'adj_18', '내 의견 확실한': 'adj_19', '몸으로 배우는': 'adj_20',
      '믿음직한': 'adj_21', '포기 안 하는': 'adj_22', '자기 색 뚜렷한': 'adj_23', '몰입 잘 하는': 'adj_24', '조용히 생각하는': 'adj_25'
    }

    q1_adjectives = q1_adjectives.map((item: string) => LEGACY_MAP[item] || item)

    return {
      q1_adjectives,
      likert,
    }
  } catch {
    return DEFAULT_ANSWERS
  }
}

export function saveLocalAnswers(ans: KYKAnswers) {
  if (typeof window === 'undefined') return
  localStorage.setItem('kyk_answers', JSON.stringify(ans))
}

export async function ensureDraftStarted() {
  // 서버 draft 쿠키가 없을 수도 있으니 start 호출(서버는 항상 새 draft 만들어줄 수 있음)
  const res = await fetch('/api/kyk/start', { method: 'POST' })
  const json = await res.json().catch(() => null)
  if (json?.draft_id) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kyk_draft_id', json.draft_id)
    }
  }
}

export async function saveDraft(answers: KYKAnswers, computed?: any) {
  const draft_id = typeof window !== 'undefined' ? localStorage.getItem('kyk_draft_id') : null
  await fetch('/api/kyk/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, computed, draft_id }),
  })
}