import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages, action, content } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Card action (summarize, expand, etc.)
    if (action && content) {
      const prompts: Record<string, string> = {
        summarize: `Summarize this concisely in 2-3 sentences:\n\n${content}`,
        expand: `Expand on this with more detail, examples, and depth. Keep it well-structured:\n\n${content}`,
        improve: `Improve the writing quality of this text. Make it clearer, more professional, and better structured. Return only the improved text:\n\n${content}`,
        brainstorm: `Based on this topic, brainstorm 5-7 creative related ideas. Format as a bullet list:\n\n${content}`,
        fix: `Fix any grammar, spelling, and punctuation errors in this text. Return only the corrected text:\n\n${content}`,
      };

      const prompt = prompts[action] || `Help with this:\n\n${content}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return NextResponse.json({ result: text });
    }

    // Chat mode
    if (messages && messages.length > 0) {
      // Build history: must alternate user/model, must start with user
      const historyMessages = messages.slice(0, -1)
        .filter((m: { role: string; content: string }) => m.content.trim())
        .map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      // Ensure history starts with "user" if not empty
      if (historyMessages.length > 0 && historyMessages[0].role !== "user") {
        historyMessages.shift();
      }

      const lastMessage = messages[messages.length - 1];

      // If no history, just do a simple generate
      if (historyMessages.length === 0) {
        const result = await model.generateContent(lastMessage.content);
        const text = result.response.text();
        return NextResponse.json({ result: text });
      }

      const chat = model.startChat({ history: historyMessages });
      const result = await chat.sendMessage(lastMessage.content);
      const text = result.response.text();
      return NextResponse.json({ result: text });
    }

    return NextResponse.json({ error: "No messages or action provided" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI request failed";
    console.error("AI error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
