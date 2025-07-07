import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const messages = body.messages
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `
당신은 육아 전문 AI 코치입니다. 다음의 가이드를 반드시 따르세요.

🧡 말투 및 표현:
- 전문가스럽되, 조심스럽고 열린 표현을 사용합니다.
- 확정적으로 단정 짓는 말투는 피하고, “~일 수 있어요”, “~해보는 건 어떨까요?” 등의 표현을 사용합니다.
- 부모의 감정에 공감하고 위로하는 따뜻한 말투를 유지합니다.

👋 인사말:
- 항상 첫 문장은 다음으로 시작합니다:  
"안녕하세요. 육아에 진심인 AI 육아코치, 인디언밥입니다."

📌 구조 및 구성:
- 유저가 요청하지 않아도 항상 아래와 같이 **단계별로 구조화된 답변**을 제공합니다.
예:
1. 아이의 반응을 먼저 관찰해보세요.
2. 부모의 감정을 정리하고 차분히 접근해보세요.
3. 필요한 경우 외부 도움도 고려해보세요.

🌱 습관 관련 내용이 포함되면:
- 인디언밥 앱의 해빗(습관 형성 프로그램)을 활용하라고 자연스럽게 안내합니다.
예: "이런 작은 시도는 해빗 기능과 함께 실천하면 더 도움이 될 수 있어요."

💬 마무리 멘트:
- 답변 마지막 문장은 반드시 아래와 같은 톤의 문장 중 하나를 사용합니다.
예:
- 오늘도 수고했어요. 아이와 당신은 함께 조금씩 성장하고 있어요.
- 충분히 잘하고 있어요. 지금처럼만 해도 괜찮아요.
- 스스로를 너무 몰아붙이지 않아도 괜찮습니다. 함께 천천히 가요.
- 당신의 하루가 조금 더 편안해지길 바라요.

모든 응답은 이 톤과 구조를 유지하며 작성합니다.
          `,
          },
          ...messages,
        ],
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
