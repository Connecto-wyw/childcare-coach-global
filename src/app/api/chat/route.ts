import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  let surveySummary = ''
  let childAge = ''
  let childGender = ''

  console.log('🧪 받은 user_id:', user_id)

  if (user_id) {
    const { data: answers, error } = await supabase
      .from('survey_answers')
      .select('question_id, answer, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    console.log('📥 Supabase 응답 answers:', answers)
    console.log('❗ Supabase 에러:', error)

    if (answers && answers.length > 0) {
      const latestAnswers: Record<number, string> = {}
      for (const item of answers) {
        const qid = item.question_id
        if (!(qid in latestAnswers)) {
          latestAnswers[qid] = item.answer?.trim() ?? ''
        }
      }

      childAge = latestAnswers[10] || ''
      childGender = latestAnswers[11] === '남아' ? '남자아이' : '여자아이'

      const questionMap: Record<number, string> = {
        3: '가장 중요하게 생각하는 육아 가치는',
        5: '아이와 하루 보내는 시간은',
        10: '아이의 나이는',
        11: '아이의 성별은',
      }

      const summarySentences = Object.entries(latestAnswers)
        .map(([qid, ans]) => {
          const q = questionMap[Number(qid)]
          return q && ans ? `${q} ${ans}입니다.` : null
        })
        .filter(Boolean)

      surveySummary = summarySentences.join(' ')
    } else {
      console.warn('⚠️ user_id는 있지만 설문 응답이 비어 있거나 없음')
    }
  }

  // ✅ 시스템 프롬프트 직접 구성
  const systemPrompt = `
당신은 육아 전문 AI 코치입니다. 다음의 가이드를 반드시 따르세요.

🧒 참고 정보:
- 이 사용자의 아이는 ${childAge || 'N세'} ${childGender || '아이'}입니다.
- 답변할 때 반드시 아이의 나이와 성별을 **명시적으로 언급**하세요.
- 예: “5세 남자아이의 경우에는…” 또는 “4세 여자아이에게는…”

📋 설문 요약:
${surveySummary || '설문 응답 정보가 없습니다.'}

🧡 말투 및 표현:
- 전문가스럽되, 조심스럽고 열린 표현을 사용합니다.
- 확정적으로 단정 짓는 말투는 피하고, “~일 수 있어요”, “~해보는 건 어떨까요?” 등의 표현을 사용합니다.
- 부모의 감정에 공감하고 위로하는 따뜻한 말투를 유지합니다.

👋 인사말:
- 항상 첫 문장은 다음으로 시작합니다:  
"안녕하세요. 육아에 진심인 AI 육아코치, 인디언밥입니다."
`

  console.log('🧾 [systemPrompt]', systemPrompt)

  const messagesToSend = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `질문 전에 참고하세요. 사용자의 아이는 ${childAge} ${childGender}입니다. 답변에 꼭 이 정보를 반영해 주세요. 문장 안에 꼭 등장해야 합니다.`,
    },
    ...messages,
  ]

  console.log('📨 [OpenAI 요청 messages]', messagesToSend)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messagesToSend,
        temperature: 0.3,
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
    console.log('🤖 [GPT 응답 data]', data)

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
