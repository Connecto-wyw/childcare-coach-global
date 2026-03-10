export const Q1_ADJECTIVES = [
  'adj_1', 'adj_2', 'adj_3', 'adj_4', 'adj_5',
  'adj_6', 'adj_7', 'adj_8', 'adj_9', 'adj_10',
  'adj_11', 'adj_12', 'adj_13', 'adj_14', 'adj_15',
  'adj_16', 'adj_17', 'adj_18', 'adj_19', 'adj_20',
  'adj_21', 'adj_22', 'adj_23', 'adj_24', 'adj_25'
] as const

export const LIKERT_OPTIONS = [
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
] as const

export const Q2_TO_Q13 = [
  { key: 'q2' },
  { key: 'q3' },
  { key: 'q4' },
  { key: 'q5' },
  { key: 'q6' },
  { key: 'q7' },
  { key: 'q8' },
  { key: 'q9' },
  { key: 'q10' },
  { key: 'q11' },
  { key: 'q12' },
  { key: 'q13' },
] as const

export type LikertValue = 1 | 2 | 3 | 4

export type KYKAnswers = {
  q1_adjectives: string[] // 5개 선택
  likert: Partial<Record<(typeof Q2_TO_Q13)[number]['key'], LikertValue>>
}