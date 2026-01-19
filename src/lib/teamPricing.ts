// src/lib/teamPricing.ts

export type TeamPricingInput = {
  basePrice: number
  minPrice: number
  discountStepPercent: number
  discountStepEvery: number
  maxDiscountPercent: number

  // ✅ 정식 키
  participantCount?: number

  // ✅ 과거/실수 키 호환용
  participants?: number
}

export type TeamPricingResult = {
  basePrice: number
  minPrice: number
  discountStepPercent: number
  discountStepEvery: number
  maxDiscountPercent: number
  participantCount: number

  // 계산 결과
  discountPercent: number

  // ✅ 최종 가격(최저가 보장 포함)
  finalPrice: number

  // ✅ UI에서 쓰기 좋은 alias (네 컴포넌트가 currentPrice를 기대함)
  currentPrice: number

  // ✅ 다음 할인 구간까지 남은 인원 (0이면 이미 해당 구간)
  toNextStep: number

  // ✅ 현재 구간 진행률(0~100)
  progressPercent: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function calcTeamItemPricing(input: TeamPricingInput): TeamPricingResult {
  const participantCount = input.participantCount ?? input.participants ?? 0

  const basePrice = Number(input.basePrice ?? 0)
  const minPrice = Number(input.minPrice ?? 0)
  const discountStepPercent = Number(input.discountStepPercent ?? 0)
  const discountStepEvery = Math.max(1, Number(input.discountStepEvery ?? 1))
  const maxDiscountPercent = Number(input.maxDiscountPercent ?? 0)

  // 10명마다 1% 같은 구조: steps = floor(count / every)
  const steps = Math.floor(participantCount / discountStepEvery)
  const discountPercent = clamp(steps * discountStepPercent, 0, maxDiscountPercent)

  const discounted = Math.floor(basePrice * (1 - discountPercent / 100))
  const finalPrice = Math.max(minPrice, discounted)

  // 다음 구간까지 남은 인원
  const mod = participantCount % discountStepEvery
  const toNextStep = mod === 0 ? 0 : discountStepEvery - mod

  // 구간 진행률(0~100)
  const progressPercent = clamp((mod / discountStepEvery) * 100, 0, 100)

  return {
    basePrice,
    minPrice,
    discountStepPercent,
    discountStepEvery,
    maxDiscountPercent,
    participantCount,
    discountPercent,
    finalPrice,
    currentPrice: finalPrice,
    toNextStep,
    progressPercent,
  }
}

/**
 * ✅ 과거 코드 호환용
 * - 어떤 파일에서 calcDiscountedPrice를 import해도 빌드가 깨지지 않게 함
 * - 반환은 "최종 가격(number)"만 주는 형태로 유지
 */
export function calcDiscountedPrice(input: TeamPricingInput): number {
  return calcTeamItemPricing(input).finalPrice
}

