import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSystemPrompt } from '@/lib/systemPromptBuilder'

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

  if (user_id) {
    const { data: answers } = await supabase
      .from('survey_answers')
      .select('question_id, answer, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (answers && answers.length > 0) {
      const latestAnswers: Record<number, string> = {}

      // 항상 최신 값으로 덮어쓰기
      for (const item of answers) {
        const qid = item.question_id
        latestAnswers[qid] = item.answer?.trim() ?? ''
      }

      // 아이 나이 & 성별 처리
      childAge = latestAnswers[10] || ''
      const rawGender = latestAnswers[11] || ''
      if (rawGender.includes('남')) childGender = '남자아이'
      else if (rawGender.includes('여')) childGender = '여자아이'

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
    }
  }

  // 아이 정보 문자열 조합 (나이 없으면 생략)
  const ageText = childAge ? `${childAge}` : ''
  const genderText = childGender || '아이'
  const childInfo = [ageText, genderText].filter(Boolean).join(' ')

  // 시스템 프롬프트 생성
  const systemPrompt = buildSystemPrompt({
    user_id,
    childAge,
    childGender,
    surveySummary,
  })

  console.log('🔧 systemPrompt:\n', systemPrompt)

  const messagesToSend = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `참고: 사용자의 아이는 ${childInfo}입니다. 답변에 반드시 이 정보를 반영해 주세요.`,
    },
    ...messages,
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
