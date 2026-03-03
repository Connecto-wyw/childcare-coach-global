export const Q1_ADJECTIVES = [
  '차분한',
  '똑똑한',
  '유연한',
  '상상력이 풍부한',
  '꼼꼼한',
  '세심한',
  '똑 부러진',
  '요령있는',
  '말재주 있는',
  '의젓한',
  '친구 많은',
  '에너지넘치는',
  '겁 없는',
  '밝은',
  '긍정 뿜뿜',
  '호기심 많은',
  '착한마음씨',
  '듬직한',
  '내 의견 확실한',
  '몸으로 배우는',
  '믿음직한',
  '포기 안 하는',
  '자기 색 뚜렷한',
  '몰입 잘 하는',
  '조용히 생각하는',
] as const

export const LIKERT_OPTIONS = [
  { value: 1, label: '매우 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '그렇다' },
  { value: 4, label: '매우 그렇다' },
] as const

export const Q2_TO_Q13 = [
  { key: 'q2', text: '우리 아이는 새로운 친구를 사귀는 것이 어렵지 않다.' },
  { key: 'q3', text: '우리 아이는 혼자서도 조용히 잘 논다.' },
  { key: 'q4', text: '처음 보는 사람 앞에서도 자연스럽게 말한다.' },
  { key: 'q5', text: '우리 아이는 이야기를 들을 때 그 배경이나 이유를 궁금해한다.' },
  { key: 'q6', text: '우리 아이는 그림을 사실적으로 그리는 걸 좋아한다.' },
  { key: 'q7', text: '놀이 중 상상 속 세계나 규칙을 만들어내는 편이다.' },
  { key: 'q8', text: '친구가 울면 함께 공감하려고 한다.' },
  { key: 'q9', text: '우리 아이는 상황을 논리적으로 설명하려 한다.' },
  { key: 'q10', text: '어떤 것이 옳고 그른지를 중요하게 생각한다.' },
  { key: 'q11', text: '우리 아이는 해야 할 일을 미리 계획해서 처리하는 편이다.' },
  { key: 'q12', text: '일정이 바뀌면 당황하거나 싫어한다.' },
  { key: 'q13', text: '하고 싶은 것을 먼저 하고, 싫은 건 나중에 미루는 편이다.' },
] as const

export type LikertValue = 1 | 2 | 3 | 4

export type KYKAnswers = {
  q1_adjectives: string[] // 5개 선택
  likert: Partial<Record<(typeof Q2_TO_Q13)[number]['key'], LikertValue>>
}