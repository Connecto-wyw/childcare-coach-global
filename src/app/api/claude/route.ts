import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ChatRequestBody = {
  message: string;
  systemPrompt?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { message, systemPrompt } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY가 설정되지 않았어." },
        { status: 500 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "message가 비어 있어." },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    return NextResponse.json({
      ok: true,
      text,
      raw: response,
    });
  } catch (error) {
    console.error("Claude API route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Claude 호출 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}
