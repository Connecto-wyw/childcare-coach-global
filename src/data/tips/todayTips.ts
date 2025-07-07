// src/data/tips/todayTips.ts

export type Tip = {
  title: string
  content: string
}

const todayTips: Tip[] = [
  {
    title: '감정 질문 던지기',
    content: '아이에게 감정을 물어보는 질문을 하루 한 번 해보세요.',
  },
  {
    title: '하루 한 번 포옹',
    content: '하루에 한 번 아이를 안아주세요.',
  },
  {
    title: '감정 라벨링 연습',
    content: '아이의 감정을 따라 이름 붙여주는 연습을 해보세요.',
  },
  {
    title: '구체적인 칭찬',
    content: '아이가 한 행동을 구체적으로 칭찬해보세요.',
  },
  {
    title: '감정 다스리기 대화',
    content: '감정을 다스리는 방법을 함께 얘기해보세요.',
  },
]

export default todayTips
