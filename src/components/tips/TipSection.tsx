// src/components/tips/TipSection.tsx
import React, { useMemo } from 'react'

type Tip = {
  title: string
  body: string
}

const DEFAULT_TIPS: Tip[] = [
  { title: 'Be Specific with Praise', body: 'Praise actions, not outcomes. “I liked how you put the cars in the box when you cleaned up.” Specific praise sustains motivation.' },
  { title: 'Name the Feeling', body: 'Label emotions calmly: “You’re frustrated.” Naming feelings reduces intensity and helps kids regain control.' },
  { title: 'Offer Two Good Choices', body: 'Instead of “Stop,” offer options: “Do you want to put on shoes first or jacket first?” Choices reduce power struggles.' },
  { title: 'Catch Them Being Good', body: 'Notice small wins: “You started homework right away.” Specific noticing increases repeat behavior.' },
  { title: 'One Clear Instruction', body: 'Give one short direction at a time. Too many steps at once makes kids tune out.' },
  { title: 'Connect Before Correct', body: 'Get eye level, a gentle touch, then guide. Connection lowers defensiveness.' },
  { title: 'Use a Calm Countdown', body: 'Give a predictable transition: “In 5 minutes we clean up.” Kids handle change better with warnings.' },
  { title: 'Describe, Don’t Lecture', body: 'Say what you see: “Toys are on the floor.” Then ask: “What’s our next step?”' },
  { title: 'Praise Effort, Not Talent', body: 'Say “You worked hard” instead of “You’re smart.” Effort praise builds resilience.' },
  { title: 'Keep Rules Few', body: 'Pick 3 core rules and repeat them. Too many rules means none stick.' },

  { title: 'Repair After Conflict', body: 'After a tough moment, reconnect: “I didn’t like how I spoke. I’m here.” Repairs build trust.' },
  { title: 'Use a Visual Routine', body: 'A simple checklist (morning, bedtime) reduces reminders and arguments.' },
  { title: 'Whisper to De-escalate', body: 'Lower your voice; kids often mirror volume. Whispering can pull them back faster.' },
  { title: 'Set a Timer Together', body: 'Let them press start. Ownership makes transitions smoother.' },
  { title: 'Validate, Then Limit', body: '“You’re upset. And we’re still leaving.” Validation doesn’t remove the boundary.' },
  { title: 'Short, Neutral Consequences', body: 'Immediate and calm consequences work better than big punishments later.' },
  { title: 'Teach the Next Skill', body: 'After misbehavior, teach the alternative: “Next time say ‘Can I have a turn?’”' },
  { title: 'Reduce Words Under Stress', body: 'When emotions are high, use fewer words. Long explanations won’t land.' },
  { title: 'Use “When/Then”', body: '“When toys are in the box, then we can read.” It’s clearer than threats.' },
  { title: 'Create a Calm Corner', body: 'A cozy spot with books or sensory tools helps kids reset without shame.' },

  { title: 'Give Attention Early', body: 'Ten minutes of “special time” daily can reduce attention-seeking behaviors.' },
  { title: 'Narrate the Routine', body: '“First brush, then pajamas.” Calm narration keeps kids oriented.' },
  { title: 'Use Natural Consequences', body: 'If they forget the water bottle, they feel thirsty (and learn). Keep it safe, not punitive.' },
  { title: 'Prime Before Triggers', body: 'Before a tough situation, preview: “We’ll buy only milk. You can hold the list.”' },
  { title: 'Make Sleep Predictable', body: 'Same steps, same order. Predictability reduces bedtime battles.' },
  { title: 'Limit “No”', body: 'Use “Yes, and…” or redirect when possible. Too many “no”s create constant conflict.' },
  { title: 'Use Humor Carefully', body: 'Playfulness can reset tension. Avoid sarcasm; keep it warm.' },
  { title: 'Check Hunger & Fatigue', body: 'A lot of “behavior” is hunger, tiredness, or overstimulation.' },
  { title: 'Give a Job', body: 'Kids cooperate more when they feel useful: “Can you carry the napkins?”' },
  { title: 'Model the Words', body: 'Say the phrase you want them to use: “I’m mad. I need space.”' },

  { title: 'Praise the Start', body: 'Even beginning is progress: “You started cleaning—nice.” Momentum matters.' },
  { title: 'Use Specific “Thank You”', body: '“Thanks for putting your plate in the sink.” Specific gratitude reinforces habits.' },
  { title: 'Ask for a Redo', body: '“Try that again with a kinder voice.” Redos teach skills without shame.' },
  { title: 'Keep Boundaries Simple', body: 'One sentence boundary, then follow through. Repeating invites negotiation.' },
  { title: 'Focus on Safety First', body: 'When safety is involved, act quickly—then explain later when calm.' },
  { title: 'Use a Calm Face', body: 'Kids read your face faster than your words. Neutral calm helps them settle.' },
  { title: 'Limit Screen Transitions', body: 'Screens are hard to stop. Use a timer + clear “last episode” plan.' },
  { title: 'Celebrate Micro-Wins', body: 'Small wins stack up. Celebrating the tiny steps boosts persistence.' },
  { title: 'Keep Promises Small', body: 'Don’t promise big rewards. Small, consistent follow-through builds trust.' },
  { title: 'Co-regulate First', body: 'If they’re flooded, regulate with them (breathing, hug), then problem-solve.' },

  { title: 'Use “I Notice…”', body: '“I notice you shared.” Noticing feels less performative than praise to some kids.' },
  { title: 'Make Cleanup a Game', body: 'Race the timer or sort by color. Play turns chores into cooperation.' },
  { title: 'Give Space for Big Feelings', body: 'You can hold the boundary and allow feelings: “Cry if you need. I’m here.”' },
  { title: 'Teach “Help” Words', body: 'Practice: “Help me,” “Can you show me?” It reduces whining and shutdowns.' },
  { title: 'One Routine Change at a Time', body: 'If you change everything at once, nothing sticks. Change one habit for a week.' },
  { title: 'Use a Bridge Activity', body: 'Between tasks, use a short bridge: water sip, stretch, 10 breaths.' },
  { title: 'Prepare the Environment', body: 'If it’s hard to succeed, change the setup: fewer toys out, clear bins, visible labels.' },
  { title: 'Use Gentle Touch Cues', body: 'A hand on the shoulder can guide better than repeating words.' },
  { title: 'End With Connection', body: 'After rules and routines, end with warmth: a story, cuddle, or quick chat.' },
  { title: 'Stay Consistent for 7 Days', body: 'Most changes look worse before better. Give a full week before you judge the method.' },
]

function pickTwoRandom(tips: Tip[]) {
  if (!Array.isArray(tips) || tips.length === 0) return DEFAULT_TIPS.slice(0, 2)
  if (tips.length === 1) return tips

  const a = Math.floor(Math.random() * tips.length)
  let b = Math.floor(Math.random() * tips.length)
  if (b === a) b = (a + 1) % tips.length
  return [tips[a], tips[b]]
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M20 6L9 17l-5-5"
        stroke="#1e1e1e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function TipSection({ tips = DEFAULT_TIPS }: { tips?: Tip[] }) {
  // ✅ 랜덤 2개만
  const items = useMemo(() => pickTwoRandom(Array.isArray(tips) && tips.length > 0 ? tips : DEFAULT_TIPS), [tips])

  return (
    <div className="space-y-4">
      {items.map((tip, idx) => (
        <div
          key={`${tip.title}-${idx}`}
          // ✅ "왼쪽으로 붙어보이게": px-4 -> px-3 (패딩 축소)
          className="bg-[#f0f7fd] px-3 py-4"
        >
          {/* 상단: 체크 + 제목 */}
          <div className="flex items-start gap-2">
            <CheckIcon />
            <div className="text-[#3497f3] text-[15px] font-medium leading-snug">
              {tip.title}
            </div>
          </div>

          {/* 본문: 체크 아이콘 아래부터 시작 */}
          {/* ✅ gap도 줄였으니 20(icon)+8(gap)=28px -> ml-[28px] */}
          <div className="mt-2 ml-[28px] text-[#1e1e1e] text-[13px] font-normal leading-relaxed">
            {tip.body}
          </div>
        </div>
      ))}
    </div>
  )
}
