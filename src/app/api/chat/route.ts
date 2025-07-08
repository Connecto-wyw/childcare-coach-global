import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ Supabase 서버 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


export async function POST(req: Request) {
  const body = await req.json()
  const { messages, user_id } = body
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { success: false, reply: 'OpenAI API 키가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  // ✅ 설문 응답 조회
  let surveySummary = ''
  let childAge = ''
  let childGender = ''

  if (user_id) {
    const { data: answers } = await supabase
      .from('survey_answers')
      .select('question_id, answer')
      .eq('user_id', user_id)

    if (answers && answers.length > 0) {
      // 나이 및 성별 추출
      answers.forEach((item) => {
        if (item.question_id === 10) {
          childAge = item.answer?.trim() ?? ''
        }
        if (item.question_id === 11) {
          childGender = item.answer?.trim() === '남아' ? '남자아이' : '여자아이'
        }
      })

      // 설문 요약 생성
      const summarySentences = answers
        .sort((a, b) => a.question_id - b.question_id)
        .map((item) => {
          const q = questionMap[item.question_id]
          const a = item.answer?.trim()
          return q && a ? `${q} ${a}입니다.` : null
        })
        .filter(Boolean)

      surveySummary = summarySentences.join(' ')
    }
  }

  // ✅ 시스템 프롬프트 구성
  const systemPrompt = `
당신은 육아 전문 AI 코치입니다. 다음의 가이드를 반드시 따르세요.

🧒 참고 정보:
- 이 사용자의 아이는 ${childAge || 'N세'} ${childGender || '아이'}입니다.
- 답변할 때 반드시 아이의 나이와 성별을 **명시적으로 언급**하세요.
- 예: “5세 남자아이의 경우에는…” 또는 “4세 여자아이에게는…”

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

${
  surveySummary
    ? `\n\n📌 이 사용자는 최근 설문에서 아래와 같은 응답을 했습니다:\n${surveySummary}`
    : ''
}
`.trim()

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
            content: systemPrompt,
          },
          ...messages,
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ GPT API 오류:', errorText)
      return NextResponse.json({
        success: false,
        reply: 'AI육아코치가 현재 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
      })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || '응답을 받지 못했어요.'

    return NextResponse.json({
      success: true,
      reply,
    })
  } catch (error) {
    console.error('❌ 예외 발생:', error)
    return NextResponse.json({
      success: false,
      reply: 'AI육아코치 응답 중 문제가 발생했어요. 다시 시도해 주세요.',
    })
  }
}
