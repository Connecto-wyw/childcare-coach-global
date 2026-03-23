import { dispatchPointEarn } from '@/components/ui/PointEarnToast'

export async function earnPoints(amount: number, reason: string): Promise<void> {
  try {
    const res = await fetch('/api/points/earn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    })
    const data = await res.json()
    if (data.ok && data.pointsAdded > 0) {
      dispatchPointEarn(data.pointsAdded, reason)
    }
  } catch {}
}
