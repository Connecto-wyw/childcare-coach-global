import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { requireAdminAuth } from '@/lib/auth/isAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_INPUT_LENGTH = 5000

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminAuth()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.detail }, { status: auth.status })
    }

    // 3. Payload Extraction and Empty/Length Policies
    const body = await req.json().catch(() => ({} as any))
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: 'Source text is empty. Nothing to translate.' }, { status: 400 })
    }

    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Input exceeds the maximum length limit of ${MAX_INPUT_LENGTH} characters.` },
        { status: 400 }
      )
    }

    // 4. OpenAI Invocation
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key configuration is missing.' }, { status: 500 })
    }

    const systemPrompt = `You are a professional context-aware translator.
You will be provided with an English text.
Your task is to translate it into Indonesian (id), Malay (ms), and Thai (th).

CRITICAL RULES:
1. Preserve all markdown formatting exactly (e.g., # headers, **bold**, *italic*, [links](url), bullet lists, etc.).
2. You must respond **strictly and only** in valid JSON format.
3. The JSON must contain exactly 3 keys: "id", "ms", and "th".
4. Do not include markdown codeblocks (\`\`\`json ...) around your response, just emit the raw JSON.`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(process.env.OPENAI_ORG_ID ? { 'OpenAI-Organization': process.env.OPENAI_ORG_ID } : {}),
        ...(process.env.OPENAI_PROJECT_ID ? { 'OpenAI-Project': process.env.OPENAI_PROJECT_ID } : {}),
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
      cache: 'no-store',
    })

    const responseText = await resp.text()

    if (!resp.ok) {
      return NextResponse.json({ error: 'Upstream Translation Engine Error', details: responseText }, { status: 502 })
    }

    const data = JSON.parse(responseText)
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'Empty translation content from engine.' }, { status: 502 })
    }

    // 5. Enforce structured response mapping (all-or-nothing check)
    try {
      const parsedTranslations = JSON.parse(content)
      
      const id = parsedTranslations.id?.trim()
      const ms = parsedTranslations.ms?.trim()
      const th = parsedTranslations.th?.trim()

      if (!id || !ms || !th) {
        return NextResponse.json(
          { error: 'Translation engine failed to provide complete localizations for all 3 target languages.' },
          { status: 502 }
        )
      }

      return NextResponse.json({ id, ms, th }, { status: 200 })
      
    } catch (parseError) {
      return NextResponse.json({ error: 'Failed to parse JSON translation structure.' }, { status: 502 })
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error while translating.', details: error.message },
      { status: 500 }
    )
  }
}
