/**
 * kykProfiles.ts
 * 16가지 MBTI 유형별 한국어 유형명 + AI 코치가 참고할 영어 성향 설명
 * - typeName: 결과 페이지에 표시되는 한국어 유형명
 * - description: 시스템 프롬프트에 주입되는 영어 설명 (AI가 조언 생성에 활용)
 */

export type KYKTypeProfile = {
  typeName: string       // 한국어 유형명 (예: "냉철한 부엉이형")
  animal: string         // 동물 (예: "부엉이")
  description: string    // AI용 영어 설명
}

export const KYK_TYPE_PROFILES: Record<string, KYKTypeProfile> = {
  INTJ: {
    typeName: '냉철한 부엉이형',
    animal: '부엉이',
    description:
      'Strategic and analytical planner who thinks far ahead. Independent and goal-oriented, with strong logical reasoning and efficiency. ' +
      'May become perfectionistic and put pressure on themselves. Thrives in science, strategy games, and research projects. ' +
      'Benefits from practicing flexibility and building collaboration experience.',
  },
  INTP: {
    typeName: '솔직한 물고기형',
    animal: '물고기',
    description:
      'Deep thinker who loves exploring concepts and principles. Imaginative and analytical, focused on understanding underlying logic. ' +
      'May stay in thought rather than taking action. Excels in science, math, programming, and invention. ' +
      'Grows significantly when ideas are turned into small experiments and projects.',
  },
  INFJ: {
    typeName: '상상력 넘치는 풍뎅이형',
    animal: '풍뎅이',
    description:
      'Insightful counselor who understands people and situations with deep empathy. Creative and meaning-seeking. ' +
      'May burn out without enough alone time. Shows potential in writing, counseling, and artistic activities. ' +
      'Needs support maintaining their own pace and finding inspiring activities.',
  },
  INFP: {
    typeName: '이상적인 나비형',
    animal: '나비',
    description:
      'Idealistic dreamer who lives by strong personal values. Rich imagination and creativity, deeply sincere about what they believe in. ' +
      'May experience stress with practical realities. Excels in writing, art, and creative pursuits. ' +
      'Benefits from learning to balance ideals with realistic steps.',
  },
  ISTJ: {
    typeName: '조용한 물고기형',
    animal: '물고기',
    description:
      'Responsible and careful promise-keeper who values stability and order. Methodical planner who finishes what they start. ' +
      'May find sudden changes overwhelming. Thrives in academic study, rule-based sports, and long-term projects. ' +
      'Benefits from gradually taking on new challenges while maintaining their strengths.',
  },
  ISTP: {
    typeName: '관대한 부엉이형',
    animal: '부엉이',
    description:
      'Practical problem-solver who adapts quickly to situations. Excellent observational skills and learns by doing. ' +
      'May have less interest in long-term planning. Stands out in hands-on activities, experiments, and sports. ' +
      'Grows when encouraged to take on longer-term challenges.',
  },
  ISFJ: {
    typeName: '온화한 나비형',
    animal: '나비',
    description:
      'Deeply caring and responsible protector who loves helping others. Quietly and reliably completes tasks. ' +
      'May exhaust themselves by prioritizing others over self. Becomes a trusted team member in caregiving, service, and group projects. ' +
      'Needs guidance to set personal time aside and maintain self-care.',
  },
  ISFP: {
    typeName: '감성적인 풍뎅이형',
    animal: '풍뎅이',
    description:
      'Gentle, artistic soul who values beauty and harmony. Absorbs deeply in nature, art, and music. ' +
      'May find it uncomfortable to assert opinions strongly. Shows talent in art, music, design, and writing. ' +
      'Grows when given diverse ways to express themselves.',
  },
  ENTJ: {
    typeName: '야망있는 호랑이형',
    animal: '호랑이',
    description:
      'Driven, goal-oriented leader who plans and executes efficiently. Makes decisions confidently and embraces difficult challenges. ' +
      'May become impatient with others\' pace. Achieves in group activities requiring leadership, debate, and project work. ' +
      'Matures when learning to listen to others and adjust their speed.',
  },
  ENTP: {
    typeName: '참견쟁이 늑대형',
    animal: '늑대',
    description:
      'Creative inventor who enjoys debate and finds innovative solutions. Curious and good at seeing multiple perspectives. ' +
      'Quick-witted in discussions but may have weak follow-through. Excels in invention competitions and creative problem-solving. ' +
      'Benefits from building the habit of completing what they start.',
  },
  ENFJ: {
    typeName: '조화로운 돌고래형',
    animal: '돌고래',
    description:
      'Empathetic leader who deeply understands emotions and motivates others. Discovers strengths in people and offers warm support. ' +
      'May take on too much of others\' problems. Shines in volunteer work, leadership camps, and cooperative projects. ' +
      'Needs to learn to care for their own emotions while helping others.',
  },
  ENFP: {
    typeName: '열정적인 말형',
    animal: '말',
    description:
      'Free-spirited explorer who loves new experiences and people. Creative, imaginative, and energizing to those around them. ' +
      'May find it hard to sustain focus on one thing. Leads new initiatives and becomes a mood-maker in various activities. ' +
      'Grows when connecting ideas to execution plans.',
  },
  ESTJ: {
    typeName: '솔직한 늑대형',
    animal: '늑대',
    description:
      'Honest, responsible, and team-oriented leader. Follows rules well and delivers tasks accurately and efficiently. ' +
      'May push their views too strongly at times. Likely to become a natural leader in presentations, group activities, and role-play. ' +
      'Benefits from practicing listening to diverse opinions and accepting mistakes gracefully.',
  },
  ESTP: {
    typeName: '활동적인 호랑이형',
    animal: '호랑이',
    description:
      'Energetic, action-oriented adventurer with quick situational awareness. Curious about new things and loves learning through action. ' +
      'May act before thinking things through. Stands out in sports, exploration, and fast-paced activities. ' +
      'Benefits from developing simple pre-action planning habits.',
  },
  ESFJ: {
    typeName: '에너지 넘치는 말형',
    animal: '말',
    description:
      'Warm, social caretaker who finds joy in helping others. Skilled at sensing mood changes and creating positive atmospheres. ' +
      'May be overly conscious of others\' expectations. Excels as a central figure in teamwork and coordinating activities. ' +
      'Needs to develop the habit of securing personal time while helping others.',
  },
  ESFP: {
    typeName: '긍정적인 돌고래형',
    animal: '돌고래',
    description:
      'Bright, spontaneous optimist who creates fun and warmth. Adapts quickly to new people and activities. ' +
      'May prefer spontaneity over preparation. Becomes a center of attention at events and performances. ' +
      'Benefits from building preparation and follow-through habits alongside their natural spontaneity.',
  },
}

/**
 * MBTI 타입으로 유형 프로파일 조회
 * 없으면 null 반환
 */
export function getKYKTypeProfile(mbtiType: string): KYKTypeProfile | null {
  return KYK_TYPE_PROFILES[mbtiType.toUpperCase()] ?? null
}
