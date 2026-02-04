// src/app/reward/page.tsx (Server Component)
import RewardClient from './RewardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function pointsForDay(day: number) {
  if (day >= 1 && day <= 6) return 100
  if (day === 7) return 300
  if (day >= 8 && day <= 13) return 100
  if (day === 14) return 600
  return 0
}

export default function RewardPage() {
  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold">REWARD</h1>
          <a href="/coach" className="text-[#3497f3] text-[14px] font-semibold hover:underline">
            Back to Coach →
          </a>
        </div>

        <section className="mt-6 bg-[#f0f7fd] p-5">
          <div className="text-[15px] font-medium">Daily Check-in</div>
          <p className="mt-2 text-[14px] text-gray-700 leading-relaxed">
            Ask 1 question on Coach each day to earn points.
            <br />
            Complete 14 days to finish the cycle, then it restarts from Day 1.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px] text-gray-700">
            <div className="border border-[#dcdcdc] bg-white p-3">
              <div className="font-semibold">Rewards</div>
              <div className="mt-2 leading-relaxed">
                Day 1–6: 100p/day<br />
                Day 7: 300p<br />
                Day 8–13: 100p/day<br />
                Day 14: 600p
              </div>
            </div>

            <div className="border border-[#dcdcdc] bg-white p-3">
              <div className="font-semibold">Rule</div>
              <div className="mt-2 leading-relaxed">
                One claim per day.<br />
                Missing a day resets streak to Day 1.<br />
                Points are added to your balance.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="text-[15px] font-medium mb-3">14-Day Stamp Board</div>
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 14 }).map((_, i) => {
              const day = i + 1
              const reward = pointsForDay(day)
              return (
                <div key={day} className="border border-gray-200 bg-[#fafafa] p-3 text-center">
                  <div className="text-[12px] text-gray-600">Day {day}</div>
                  <div className="mt-2 text-[18px]">⬜️</div>
                  <div className="mt-2 text-[12px] text-gray-600">{reward}p</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-10">
          <RewardClient />
        </section>
      </div>
    </main>
  )
}
