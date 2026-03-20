import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log("ANTHROPIC_API_KEY exists:", !!apiKey);

if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 환경변수가 없습니다.");
    process.exit(1);
}

const client = new Anthropic({
    apiKey,
});

async function main() {
    const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [
            {
                role: "user",
                content: "한 줄로 답해. Claude API 연결 테스트 중이야.",
            },
        ],
    });

    const text = res.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");

    console.log("Claude 응답:");
    console.log(text);
}

main().catch((err) => {
    console.error("실행 중 오류 발생:");
    console.error(err);
});