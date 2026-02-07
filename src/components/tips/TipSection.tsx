// src/components/tips/TipSection.tsx
'use client'

import { useMemo } from 'react'

type Tip = {
  title: string
  body: string
}

const DEFAULT_TIPS: Tip[] = [
  {
    title: '✅ Be Specific with Praise',
    body: 'Praise actions, not outcomes. “I liked how you cleaned up your toys.” keeps motivation steady.',
  },
  {
    title: '🧠 Name the Feeling First',
    body: 'Try “You seem frustrated.” Naming emotions reduces intensity and opens cooperation.',
  },
  {
    title: '🎯 One Instruction at a Time',
    body: 'Short, single-step directions work better than multi-step commands.',
  },
  {
    title: '🟦 Offer Two Good Choices',
    body: '“Red cup or blue cup?” gives autonomy while keeping boundaries.',
  },
  {
    title: '🤝 Connect Before Correct',
    body: 'A brief connection (“I’m here.”) makes guidance land better.',
  },
  {
    title: '⏳ Use a Calm Countdown',
    body: 'Give a gentle 10→0 countdown for transitions instead of repeating yourself.',
  },
  {
    title: '👀 Describe What You See',
    body: 'Narrate: “Shoes are by the door.” Description can prompt action without a fight.',
  },
  {
    title: '🩹 Repair After a Hard Moment',
    body: 'After conflict: “We both got upset. Let’s try again.” Repair builds trust.',
  },
  {
    title: '🧩 Tiny Routines Win',
    body: 'Small, repeatable routines beat big plans. Keep it easy to do daily.',
  },
  {
    title: '🏃‍♀️ Move the Body to Reset',
    body: 'A short walk, stretch, or jumping breaks can reduce big feelings fast.',
  },

  {
    title: '🖼️ Use Visual Reminders',
    body: 'Simple pictures (morning steps) help kids follow routines with less nagging.',
  },
  {
    title: '⚡ Catch the Good Fast',
    body: 'Point out good behavior the moment it happens. The timing matters.',
  },
  {
    title: '🫶 Lower the Words, Raise the Warmth',
    body: 'Fewer words + gentle tone often works better than long explanations.',
  },
  {
    title: '🧭 Make Transitions Predictable',
    body: '“In 5 minutes we’ll stop.” Predictability reduces resistance.',
  },
  {
    title: '🧳 Pre-Teach Expectations',
    body: 'Before leaving: “We’re buying only groceries. You can help pick apples.”',
  },
  {
    title: '➡️ Use “When/Then” Language',
    body: '“When shoes are on, then we go.” Clear and non-negotiable without sounding harsh.',
  },
  {
    title: '🧑‍🍳 Give a Job',
    body: 'Kids cooperate more when they have a role: “You’re the door opener.”',
  },
  {
    title: '🛑 Validate + Boundary',
    body: '“You’re mad. It’s okay to be mad. It’s not okay to hit.”',
  },
  {
    title: '🪑 Short Time-In',
    body: 'Sit nearby for 1 minute. Connection can calm faster than isolation.',
  },
  {
    title: '🧸 Build a “Calm Corner”',
    body: 'A pillow + book + sensory item gives a go-to reset spot.',
  },

  {
    title: '🌿 Use Natural Consequences',
    body: 'If water spills, we wipe together. Keep it calm and matter-of-fact.',
  },
  {
    title: '🧯 Reduce Decision Fatigue',
    body: 'Offer fewer options when a child is tired/hungry.',
  },
  {
    title: '🍎 Fuel First',
    body: 'Snack + water often fixes “mystery” meltdowns faster than talking.',
  },
  {
    title: '🌙 Morning Wins Start at Night',
    body: 'Lay out clothes and bags the night before to cut morning friction.',
  },
  {
    title: '✅ Make “Yes” Easy',
    body: 'Move tempting items out of reach so you can say “yes” more often.',
  },
  {
    title: '⏲️ Use a Timer for Fairness',
    body: 'A timer reduces power struggles: “Timer decides, not me.”',
  },
  {
    title: '🏋️ Praise Effort, Not Talent',
    body: '“You kept trying.” builds resilience more than “You’re so smart.”',
  },
  {
    title: '🧪 Practice in Low-Stress Moments',
    body: 'Teach skills (sharing, waiting) when calm—then it shows up under stress.',
  },
  {
    title: '📌 Keep Consequences Immediate',
    body: 'Immediate and small is more effective than delayed and big.',
  },
  {
    title: '🗣️ Model the Words',
    body: 'Give scripts: “Can I have a turn?” Practice it once, then use it.',
  },

  {
    title: '😄 Use Humor (Lightly)',
    body: 'A silly voice or playful line can break tension without dismissing feelings.',
  },
  {
    title: '🔎 Notice Triggers',
    body: 'Track patterns: hunger, noise, screens, transitions. Then prevent more.',
  },
  {
    title: '📵 Screen Time: End with a Ritual',
    body: 'A consistent “one last thing” + shutdown routine reduces battles.',
  },
  {
    title: '📏 Keep Rules Few and Clear',
    body: '3–5 house rules beat a long list. Kids remember simple.',
  },
  {
    title: '🤫 Whisper to Lower the Room',
    body: 'Whispering can pull kids toward calm without escalating volume.',
  },
  {
    title: '🕰️ Give Space for Processing',
    body: 'Some kids need 5–10 seconds before answering. Wait quietly.',
  },
  {
    title: '➕ Use Positive Framing',
    body: '“Walk inside” works better than “Don’t run.”',
  },
  {
    title: '💛 Front-Load Attention',
    body: '10 minutes of focused attention reduces attention-seeking later.',
  },
  {
    title: '🎲 Make Cleanup a Game',
    body: 'Race the song, “toy rescue,” or “color hunt” makes it doable.',
  },
  {
    title: '🧱 Use Micro-Goals',
    body: '“Put away 5 blocks” is easier than “Clean everything.”',
  },

  {
    title: '🌬️ Teach “Pause Breath Try”',
    body: 'A simple coping script kids can remember in tough moments.',
  },
  {
    title: '🫧 Separate Child from Behavior',
    body: '“You’re a good kid having a hard time.” reduces shame.',
  },
  {
    title: '🧡 Hold the Boundary, Keep the Warmth',
    body: 'Firm + kind works. “I won’t let you throw. I’m here.”',
  },
  {
    title: '🛏️ Avoid Lectures at Bedtime',
    body: 'Bedtime is for calm. Teach in daylight, repair in daylight.',
  },
  {
    title: '🧷 Use a Routine Phrase',
    body: 'Same phrase every time (“First bathroom, then story”) builds safety.',
  },
  {
    title: '🧸 Give a Transitional Object',
    body: 'A small toy or photo can ease separation anxiety.',
  },
  {
    title: '🔁 Practice “Redo”',
    body: '“Let’s redo that with a calmer voice.” Teaches skill without punishment.',
  },
  {
    title: '✂️ Simplify Your “No”',
    body: 'Short “No + what to do” is better than long explanations in the moment.',
  },
  {
    title: '⏳ Teach Waiting with Tiny Steps',
    body: 'Start with 10 seconds, then 20, then 30—waiting is a skill.',
  },
  {
    title: '🎉 Celebrate Small Improvements',
    body: 'Progress is the goal. Notice the 5% change and name it.',
  },
]

function pickThreeRandom(tips: Tip[]) {
  const arr = tips.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, 3) // ✅ 3개 노출
}

export default function TipSection({ tips = DEFAULT_TIPS }: { tips?: Tip[] }) {
  const items = useMemo(() => {
    const source = Array.isArray(tips) && tips.length > 0 ? tips : DEFAULT_TIPS
    return pickThreeRandom(source)
  }, [tips])

  // ✅ Coach 페이지에서 이미 bg/p-4 박스로 감싸고 있으므로
  // TipSection 내부에서는 “추가 카드(bg/padding)”를 없애서
  // K-Parenting News와 동일한 여백/박스 느낌으로 맞춘다.
  return (
    <div>
      {items.length === 0 ? (
        <p className="text-[15px] font-medium text-[#b4b4b4]">No tips available.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((tip, idx) => (
            <li key={`${tip.title}-${idx}`} className="flex items-start gap-3">
              {/* ✅ v 체크 표시(아이콘) 제거 */}
              <div className="min-w-0">
                <div className="text-[#3497f3] text-[15px] font-medium leading-snug">{tip.title}</div>
                <div className="mt-1 text-[#1e1e1e] text-[13px] font-normal leading-relaxed">{tip.body}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
