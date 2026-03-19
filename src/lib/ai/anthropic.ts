import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(params: {
  userMessage: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: params.model ?? "claude-sonnet-4-6",
    max_tokens: params.maxTokens ?? 1200,
    system: params.systemPrompt,
    messages: [
      {
        role: "user",
        content: params.userMessage,
      },
    ],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");
}
