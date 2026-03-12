import type { KYKAnswers } from './kykQuestions'

export type MBTIType =
  | 'INTJ' | 'INTP' | 'INFJ' | 'INFP'
  | 'ISTJ' | 'ISTP' | 'ISFJ' | 'ISFP'
  | 'ENTJ' | 'ENTP' | 'ENFJ' | 'ENFP'
  | 'ESTJ' | 'ESTP' | 'ESFJ' | 'ESFP'

export type TCIScore = 1 | 2 | 3 | 4 // 1: 낮음, 2: 보통, 3: 높음, 4: 매우높음

export interface TCIProfile {
  [key: string]: TCIScore
  NS: TCIScore // 새로움추구
  HA: TCIScore // 위해회피
  RD: TCIScore // 보상의존
  PS: TCIScore // 지속성
  SD: TCIScore // 자기지향성
  CO: TCIScore // 협동성
  ST: TCIScore // 자기초월성
}

// 1~4 점수를 -1.5 ~ +1.5 로 변환 (-1.5, -0.5, +0.5, +1.5)
function normalizeLikert(val: number | undefined): number {
  if (!val) return 0
  return val - 2.5
}

export function computeMBTI(answers: KYKAnswers): MBTIType {
  const l = answers.likert

  // E / I
  // Q2: E(+), Q4: E(+), Q3: I(+) -> E(-)
  const eiScore = normalizeLikert(l.q2) + normalizeLikert(l.q4) - normalizeLikert(l.q3)
  const E = eiScore >= 0 ? 'E' : 'I'

  // N / S
  // Q5: N(+), Q7: N(+), Q6: S(+) -> N(-)
  const nsScore = normalizeLikert(l.q5) + normalizeLikert(l.q7) - normalizeLikert(l.q6)
  const N = nsScore >= 0 ? 'N' : 'S'

  // T / F
  // Q9: T(+), Q10: T(+), Q8: F(+) -> T(-)
  const tfScore = normalizeLikert(l.q9) + normalizeLikert(l.q10) - normalizeLikert(l.q8)
  const T = tfScore >= 0 ? 'T' : 'F'

  // J / P
  // Q11: J(+), Q12: J(+), Q13: P(+) -> J(-)
  const jpScore = normalizeLikert(l.q11) + normalizeLikert(l.q12) - normalizeLikert(l.q13)
  const J = jpScore >= 0 ? 'J' : 'P'

  return `${E}${N}${T}${J}` as MBTIType
}

export const MBTI_TO_TCI: Record<MBTIType, TCIProfile> = {
  INTJ: { NS: 3, HA: 3, RD: 1, PS: 4, SD: 4, CO: 2, ST: 3 },
  INTP: { NS: 4, HA: 2, RD: 1, PS: 2, SD: 2, CO: 1, ST: 4 },
  INFJ: { NS: 2, HA: 4, RD: 2, PS: 4, SD: 4, CO: 4, ST: 4 },
  INFP: { NS: 4, HA: 2, RD: 4, PS: 2, SD: 2, CO: 4, ST: 4 },
  ISTJ: { NS: 1, HA: 4, RD: 1, PS: 4, SD: 4, CO: 2, ST: 2 },
  ISTP: { NS: 2, HA: 2, RD: 1, PS: 2, SD: 2, CO: 1, ST: 2 },
  ISFJ: { NS: 1, HA: 4, RD: 3, PS: 4, SD: 4, CO: 4, ST: 2 },
  ISFP: { NS: 2, HA: 2, RD: 4, PS: 2, SD: 2, CO: 4, ST: 4 },
  ENTJ: { NS: 3, HA: 2, RD: 1, PS: 4, SD: 4, CO: 2, ST: 2 },
  ENTP: { NS: 4, HA: 1, RD: 2, PS: 2, SD: 2, CO: 1, ST: 4 },
  ENFJ: { NS: 2, HA: 3, RD: 4, PS: 4, SD: 4, CO: 4, ST: 4 },
  ENFP: { NS: 4, HA: 1, RD: 4, PS: 2, SD: 2, CO: 4, ST: 4 },
  ESTJ: { NS: 1, HA: 3, RD: 2, PS: 4, SD: 4, CO: 2, ST: 2 },
  ESTP: { NS: 4, HA: 1, RD: 1, PS: 2, SD: 2, CO: 1, ST: 2 },
  ESFJ: { NS: 2, HA: 3, RD: 4, PS: 4, SD: 4, CO: 4, ST: 2 },
  ESFP: { NS: 4, HA: 1, RD: 4, PS: 2, SD: 2, CO: 4, ST: 3 },
}

export const MBTI_PERCENTAGES: Record<MBTIType, number> = {
  INTJ: 2.73, INTP: 3.42, INFJ: 1.89, INFP: 4.31,
  ISTJ: 12.54, ISTP: 5.61, ISFJ: 10.22, ISFP: 7.93,
  ENTJ: 3.12, ENTP: 4.89, ENFJ: 2.56, ENFP: 6.74,
  ESTJ: 11.23, ESTP: 5.43, ESFJ: 9.78, ESFP: 7.59
}
