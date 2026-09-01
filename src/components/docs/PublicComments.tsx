"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MiniThread } from "@/components/graphics/UiFragments";
import type { Comment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { smooth } from "@/lib/motion";

/**
 * Comments on a publicly shared page.
 *
 * Readers do not need an account: the insert policy allows a null user_id as
 * long as the page really is public, and the name is just a label. A signed-in
 * viewer gets their own identity attached instead.
 */
export function PublicComments({
  pageId,
  initialComments,
  signedInAs,
}: {
  pageId: string;
  initialComments: Comment[];
  signedInAs: string | null;
}) {
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const authorName = signedInAs ? signedInAs.split("@")[0] : name.trim() || "Anonymous";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;

    setBusy(true);
    setProblem(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ page_id: pageId, content, author_name: authorName })
      .select()
      .single();

    setBusy(false);

    if (error || !data) {
      setProblem("That comment could not be posted. Try again in a moment.");
      return;
    }

    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        page_id: data.page_id,
        user_id: data.user_id,
        content: data.content ?? "",
        author_name: data.author_name ?? authorName,
        created_at: new Date(data.created_at).getTime(),
      },
    ]);
    setText("");
  };

  return (
    <section aria-labelledby="comments-heading">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-ink-4" />
        <h2 id="comments-heading" className="text-[15px] font-semibold text-ink">
          {comments.length === 0
            ? "Comments"
            : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
        </h2>
      </div>

      {comments.length === 0 ? (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <MiniThread className="opacity-70" />
          <p className="mt-4 text-[14px] text-ink-3">
            Nothing here yet. Be the first to say something.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.li
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={smooth}
                className="rounded-xl border border-line bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-flame-tint text-[11px] font-semibold text-flame">
                    {comment.author_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13px] font-medium text-ink-2">
                    {comment.author_name}
                  </span>
                  <span className="text-[12px] text-ink-4">
                    {new Date(comment.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink-2">
                  {comment.content}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <form onSubmit={submit} className="mt-6 rounded-xl border border-line bg-card p-4">
        {!signedInAs && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={40}
            aria-label="Your name"
            className="mb-2 h-9 w-full rounded-lg border border-line bg-paper-sunk px-3 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-flame"
          />
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Leave a comment…"
          aria-label="Comment"
          className="w-full resize-none rounded-lg border border-line bg-paper-sunk px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-4 focus:border-flame"
        />

        {problem && <p className="mt-2 text-[13px] text-danger">{problem}</p>}

        <div className="mt-3 flex items-center gap-3">
          <p className="flex-1 text-[12px] text-ink-4">
            Posting as <span className="text-ink-3">{authorName}</span>
          </p>
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className={cn(
              "press shelf flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
              text.trim() && !busy
                ? "bg-flame text-flame-ink"
                : "bg-paper-sunk text-ink-4 [--shelf-color:transparent]",
            )}
          >
            <Send className="size-3.5" />
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </section>
  );
}
