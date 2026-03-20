import Anthropic from "@anthropic-ai/sdk";
import readline from "node:readline";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 환경변수가 없습니다.");
    process.exit(1);
}

const client = new Anthropic({ apiKey });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const messages = [];

async function askClaude(userInput) {
    messages.push({
        role: "user",
        content: userInput,
    });

    const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages,
    });

    const text = res.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");

    messages.push({
        role: "assistant",
        content: text,
    });

    return text;
}

function promptUser() {
    rl.question("\nYou> ", async (input) => {
        const trimmed = input.trim();

        if (!trimmed) {
            return promptUser();
        }

        if (trimmed === "/exit") {
            console.log("채팅 종료");
            rl.close();
            return;
        }

        if (trimmed === "/reset") {
            messages.length = 0;
            console.log("대화 기록 초기화 완료");
            return promptUser();
        }

        try {
            const answer = await askClaude(trimmed);
            console.log(`\nClaude> ${answer}`);
        } catch (error) {
            console.error("\nClaude 호출 실패");

            if (error?.error?.message) {
                console.error(error.error.message);
            } else if (error?.message) {
                console.error(error.message);
            } else {
                console.error(error);
            }
        }

        promptUser();
    });
}

console.log("Claude 터미널 채팅 시작");
console.log("종료: /exit");
console.log("초기화: /reset");

promptUser();