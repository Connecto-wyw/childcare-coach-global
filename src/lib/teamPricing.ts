// src/lib/teamPricing.ts
export function calcTeamItemPricing(args: {
  basePrice: number
  minPrice: number
  discountStepPercent: number
  discountStepEvery: number
  maxDiscountPercent: number
  participantCount: number
}) {
  const {
    basePrice,
    minPrice,
    discountStepPercent,
    discountStepEvery,
    maxDiscountPercent,
    participantCount,
  } = args

  const stepEvery = Math.max(1, Math.floor(discountStepEvery || 1))
  const stepPercent = Math.max(0, Number(discountStepPercent || 0))
  const maxPercent = Math.max(0, Number(maxDiscountPercent || 0))

  const steps = Math.floor(participantCount / stepEvery)
  const discountPercent = Math.min(maxPercent, steps * stepPercent)

  const raw = basePrice * (1 - discountPercent / 100)
  const currentPrice = Math.max(minPrice, Math.round(raw))

  const nextStepTarget = (steps + 1) * stepEvery
  const toNextStep = Math.max(0, nextStepTarget - participantCount)

  const withinStep = participantCount % stepEvery
  const progressPercent = Math.min(100, Math.round((withinStep / stepEvery) * 100))

  return {
    discountPercent,
    currentPrice,
    toNextStep,
    progressPercent,
  }
}
