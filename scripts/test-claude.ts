import Anthropic from "@anthropic-ai/sdk";

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았어. .env.local 확인해.");
  }

  const anthropic = new Anthropic({
    apiKey,
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: "TypeScript로 hello world 함수 하나만 보여줘.",
      },
    ],
  });

  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error("Claude 테스트 실패:", error);
  process.exit(1);
});
