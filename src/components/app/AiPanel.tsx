"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import { Sparkle } from "@/components/graphics/Doodles";
import { blocksToPlainText, parseBlocks } from "@/lib/blocks";
import type { AiMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { smooth } from "@/lib/motion";

const SUGGESTIONS = [
  "Summarise this page",
  "What am I missing?",
  "Turn this into an outline",
  "Suggest a better title",
];

/**
 * The assistant panel.
 *
 * Responses stream, so the first words land in a few hundred milliseconds
 * instead of after a multi-second spinner, and a request can be stopped
 * part-way through. The open page is offered as context but only sent when the
 * question actually refers to it.
 */
export function AiPanel({
  onClose,
  pageTitle,
  pageContent,
}: {
  onClose: () => void;
  pageTitle: string | null;
  pageContent: string | null;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [useContext, setUseContext] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Follow the stream, but do not yank the view if the reader has scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const userMessage: AiMessage = {
        id: `u${Date.now()}`,
        role: "user",
        content: question,
      };
      const replyId = `a${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: replyId, role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Give the model the page only when it is likely to be the subject.
      const context =
        useContext && pageContent
          ? blocksToPlainText(parseBlocks(pageContent)).slice(0, 6000)
          : "";

      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user" as const,
          content: context
            ? `Here is the page I am working on, titled "${pageTitle || "Untitled"}":\n\n${context}\n\n---\n\n${question}`
            : question,
        },
      ];

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const problem = await response
            .json()
            .then((data: { error?: string }) => data.error)
            .catch(() => null);
          throw new Error(problem ?? "The assistant is unavailable right now.");
        }
        if (!response.body) throw new Error("The assistant sent an empty response.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m)),
          );
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, streaming: false } : m)),
        );
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  streaming: false,
                  error: !aborted,
                  content: aborted
                    ? m.content || "Stopped."
                    : error instanceof Error
                      ? error.message
                      : "Something went wrong.",
                }
              : m,
          ),
        );
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, pageContent, pageTitle, useContext],
  );

  return (
    <motion.aside
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={smooth}
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[360px] flex-col border-l border-line bg-card"
      aria-label="Lumen AI"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <Sparkle className="size-3.5 text-flame" />
        <h2 className="flex-1 text-[13px] font-semibold text-ink">Ask Lumen</h2>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            title="Clear conversation"
            aria-label="Clear conversation"
            className="press rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close assistant"
          className="press rounded-lg p-1.5 text-ink-4 hover:bg-paper-sunk hover:text-ink [--press-depth:1px]"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center px-2">
            <p className="font-display text-lg leading-snug text-ink">
              What are you working on?
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
              Ask about the open page, or anything else. Answers stream in as
              they are written.
            </p>
            <div className="mt-5 flex flex-col gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => void send(suggestion)}
                  className="press rounded-lg border border-line bg-paper-sunk px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink [--press-depth:1px]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  message.role === "user"
                    ? "ml-auto rounded-br-md bg-flame text-flame-ink"
                    : message.error
                      ? "rounded-bl-md bg-danger-tint text-danger"
                      : "rounded-bl-md border border-line bg-paper-sunk text-ink-2",
                )}
              >
                <p className="whitespace-pre-wrap break-words">
                  {message.content}
                  {message.streaming && (
                    <span className="ml-1 inline-block size-[7px] animate-pulse rounded-full bg-flame align-middle" />
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        {pageTitle !== null && (
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-[12px] text-ink-4">
            <input
              type="checkbox"
              checked={useContext}
              onChange={(e) => setUseContext(e.target.checked)}
              className="size-3.5 accent-[var(--flame)]"
            />
            Include “{pageTitle || "Untitled"}” as context
          </label>
        )}

        <div className="flex items-end gap-2 rounded-xl border border-line bg-paper-sunk p-1.5 transition-colors focus-within:border-flame">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Grow with the content, up to a point.
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Ask anything…"
            className="max-h-[140px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-4"
            aria-label="Message"
          />
          {busy ? (
            <button
              onClick={() => abortRef.current?.abort()}
              aria-label="Stop generating"
              className="press flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-paper [--press-depth:1px]"
            >
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => void send(input)}
              disabled={!input.trim()}
              aria-label="Send"
              className={cn(
                "press flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors [--press-depth:1px]",
                input.trim()
                  ? "bg-flame text-flame-ink"
                  : "bg-transparent text-ink-4",
              )}
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
