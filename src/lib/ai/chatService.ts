import { anthropic } from "./anthropic";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.mjs";

export class ChatManager {
  messages: MessageParam[];
  systemPrompt: string;

  constructor(systemPrompt = "당신은 유능한 어시스턴트입니다.") {
    this.messages = [];
    this.systemPrompt = systemPrompt;
  }

  addMessage(role: "user" | "assistant", content: string) {
    this.messages.push({ role, content });
  }

  async ask(userInput: string): Promise<string> {
    this.addMessage("user", userInput);

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1200,
        system: this.systemPrompt,
        messages: this.messages,
      });

      const assistantReply = response.content
        .filter((block) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      this.addMessage("assistant", assistantReply);

      return assistantReply;
    } catch (error) {
      console.error("Claude 호출 중 오류 발생:", error);
      return "죄송합니다, 답변을 생성하는 데 문제가 발생했습니다.";
    }
  }

  clearHistory() {
    this.messages = [];
  }
}
