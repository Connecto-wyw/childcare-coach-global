export function calcDiscountedPrice(params: {
  basePrice: number
  minPrice: number
  participants: number
  discountStepPercent: number
  discountStepEvery: number
  maxDiscountPercent: number
}) {
  const {
    basePrice,
    minPrice,
    participants,
    discountStepPercent,
    discountStepEvery,
    maxDiscountPercent,
  } = params

  const stepEvery = Math.max(1, discountStepEvery)
  const stepPercent = Math.min(3, Math.max(1, discountStepPercent))
  const steps = Math.floor(participants / stepEvery)

  const rawDiscountPercent = steps * stepPercent
  const discountPercent = Math.min(maxDiscountPercent, Math.max(0, rawDiscountPercent))

  const discounted = Math.round(basePrice * (1 - discountPercent / 100))
  return Math.max(minPrice, discounted)
}
