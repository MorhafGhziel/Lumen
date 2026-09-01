import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/dal";
import { geminiApiKey } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Gemini proxy.
 *
 * The previous version accepted any request from anyone: no session check, no
 * rate limit, and the API key sitting behind a public POST endpoint. Anybody
 * who found the URL could spend the whole quota.
 *
 * Responses stream, so the assistant starts writing immediately instead of
 * showing a spinner for several seconds.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Comfortably inside the Gemini free tier, which allows far more per day than
// one person can use by hand.
const LIMIT = 20;
const WINDOW_MS = 60_000;

const MAX_INPUT_CHARS = 24_000;
const MAX_TURNS = 20;

type Action = "summarize" | "expand" | "improve" | "brainstorm" | "fix" | "outline" | "translate";

const ACTIONS: Record<Action, { system: string; instruction: string }> = {
  summarize: {
    system: "You are a precise editor.",
    instruction:
      "Summarise the following in 2-3 sentences. Keep the author's voice. Return only the summary.",
  },
  expand: {
    system: "You are a thoughtful writing partner.",
    instruction:
      "Expand the following with concrete detail and examples. Match the existing tone and structure. Return only the expanded text.",
  },
  improve: {
    system: "You are a careful copy editor.",
    instruction:
      "Improve the clarity and rhythm of the following without changing its meaning or adding new claims. Return only the improved text.",
  },
  brainstorm: {
    system: "You are a generative thinking partner.",
    instruction:
      "Suggest 5-7 related ideas worth exploring, as a plain hyphen-prefixed list. No preamble.",
  },
  fix: {
    system: "You are a proofreader.",
    instruction:
      "Correct grammar, spelling and punctuation only. Change nothing else. Return only the corrected text.",
  },
  outline: {
    system: "You are a structural editor.",
    instruction:
      "Turn the following into a clear outline of headings and sub-points, as a plain hyphen-prefixed list. No preamble.",
  },
  translate: {
    system: "You are a translator.",
    instruction:
      "Translate the following into natural, idiomatic English. Return only the translation.",
  },
};

function isAction(value: unknown): value is Action {
  return typeof value === "string" && value in ACTIONS;
}

function fail(message: string, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers: extra });
}

export async function POST(req: NextRequest) {
  // 1. Only signed-in users reach the model.
  const user = await getUser();
  if (!user) {
    return fail("Sign in to use Lumen AI.", 401);
  }

  // 2. Per-user budget, so one account cannot drain the shared key.
  const limit = rateLimit(`ai:${user.id}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return fail(
      `You are sending requests faster than the free tier allows. Try again in ${limit.retryAfterSeconds}s.`,
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Malformed request body.", 400);
  }

  const { action, content, messages } = (body ?? {}) as {
    action?: unknown;
    content?: unknown;
    messages?: unknown;
  };

  let genAI: GoogleGenerativeAI;
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey());
  } catch {
    return fail("Lumen AI is not configured on this deployment.", 503);
  }

  // ── Single-shot action on a selection or a document ──────────────────────
  if (isAction(action)) {
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) return fail("There is no text to work with yet.", 400);

    const spec = ACTIONS[action];
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: spec.system,
    });

    try {
      const result = await model.generateContentStream(
        `${spec.instruction}\n\n---\n\n${text.slice(0, MAX_INPUT_CHARS)}`,
      );
      return streamOf(result.stream);
    } catch (error) {
      return fail(describe(error), 502);
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  if (Array.isArray(messages) && messages.length > 0) {
    const turns = messages
      .filter(
        (m): m is { role: string; content: string } =>
          !!m &&
          typeof m === "object" &&
          typeof (m as { content?: unknown }).content === "string" &&
          (m as { content: string }).content.trim().length > 0,
      )
      .slice(-MAX_TURNS);

    if (turns.length === 0) return fail("Say something first.", 400);

    const latest = turns[turns.length - 1];

    // Gemini requires history to alternate and to open with a user turn.
    const history: Content[] = turns.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.slice(0, MAX_INPUT_CHARS) }],
    }));
    while (history.length > 0 && history[0].role !== "user") history.shift();

    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction:
        "You are Lumen's writing assistant. Be direct and concrete. Prefer short paragraphs and plain language. When you are unsure, say so rather than inventing detail.",
    });

    try {
      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(latest.content.slice(0, MAX_INPUT_CHARS));
      return streamOf(result.stream);
    } catch (error) {
      return fail(describe(error), 502);
    }
  }

  return fail("Provide either an action or a message.", 400);
}

/** Re-emits Gemini's chunks as a plain text stream the client can append. */
function streamOf(source: AsyncGenerator<{ text(): string }>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of source) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`\n\n[${describe(error)}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Never leak the API key or raw provider internals to the client. */
function describe(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/api key|permission|unauthenticated/i.test(raw)) {
    return "Lumen AI is not configured correctly. Check the server's GEMINI_API_KEY.";
  }
  if (/quota|resource.?exhausted|429/i.test(raw)) {
    return "The Gemini free tier quota is used up for now. Try again shortly.";
  }
  if (/safety|blocked/i.test(raw)) {
    return "The model declined to answer that one.";
  }
  console.error("[ai]", raw);
  return "The assistant could not respond. Try again.";
}
