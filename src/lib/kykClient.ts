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
    return {
      q1_adjectives: Array.isArray(parsed.q1_adjectives) ? parsed.q1_adjectives : [],
      likert: typeof parsed.likert === 'object' && parsed.likert ? parsed.likert : {},
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
  await fetch('/api/kyk/start', { method: 'POST' })
}

export async function saveDraft(answers: KYKAnswers, computed?: any) {
  await fetch('/api/kyk/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, computed }),
  })
}