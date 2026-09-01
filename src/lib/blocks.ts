import type { Block, BlockType } from "@/lib/types";

/**
 * Block document helpers.
 *
 * A page's `content` column holds a JSON array of blocks as text. Parsing and
 * serialising live here rather than inside the editor so the share page, the
 * AI panel and the word count all agree on what a document is.
 */

let counter = 0;
export function newBlockId(): string {
  counter += 1;
  return `b${counter}_${Date.now().toString(36)}`;
}

export function createBlock(type: BlockType = "text", content = ""): Block {
  return { id: newBlockId(), type, content };
}

/** Tolerant of empty, legacy plain-text, and malformed content. */
export function parseBlocks(content: string): Block[] {
  if (!content?.trim()) return [createBlock()];

  try {
    const parsed: unknown = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const blocks = parsed.filter(isBlock);
      if (blocks.length > 0) return blocks;
    }
  } catch {
    // Not JSON. Fall through and treat it as plain text, which is what the
    // very first version of this app stored.
  }

  return content
    .split("\n")
    .map((line) => createBlock("text", line))
    .slice(0, 500);
}

function isBlock(value: unknown): value is Block {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Block).id === "string" &&
    typeof (value as Block).type === "string" &&
    typeof (value as Block).content === "string"
  );
}

export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

/**
 * Readable text for AI prompts, word counts and search.
 *
 * The previous build passed the raw JSON string to Gemini and wrote the prose
 * reply straight back into `content`, which destroyed the document structure.
 * Anything that needs the text of a page should come through here.
 */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "h1":
          return `# ${block.content}`;
        case "h2":
          return `## ${block.content}`;
        case "h3":
          return `### ${block.content}`;
        case "bulleted_list":
          return `- ${block.content}`;
        case "numbered_list":
          return `1. ${block.content}`;
        case "todo":
          return `- [${block.checked ? "x" : " "}] ${block.content}`;
        case "quote":
          return `> ${block.content}`;
        case "callout":
          return `> ${block.content}`;
        case "code":
          return `\`\`\`\n${block.content}\n\`\`\``;
        case "divider":
          return "---";
        case "image":
          return block.caption ? `[image: ${block.caption}]` : "[image]";
        default:
          return block.content;
      }
    })
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

/** Turns an AI reply back into blocks, so results keep their structure. */
export function plainTextToBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ ...createBlock("code", codeLines.join("\n")) });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(raw);
      continue;
    }

    if (!line.trim()) continue;

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(createBlock(level === 1 ? "h1" : level === 2 ? "h2" : "h3", heading[2]));
      continue;
    }

    const todo = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (todo) {
      blocks.push({ ...createBlock("todo", todo[2]), checked: todo[1].toLowerCase() === "x" });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push(createBlock("bulleted_list", bullet[1]));
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      blocks.push(createBlock("numbered_list", numbered[1]));
      continue;
    }

    if (/^>\s?/.test(line)) {
      blocks.push(createBlock("quote", line.replace(/^>\s?/, "")));
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(line.trim())) {
      blocks.push(createBlock("divider", ""));
      continue;
    }

    blocks.push(createBlock("text", line));
  }

  if (inCode && codeLines.length > 0) {
    blocks.push(createBlock("code", codeLines.join("\n")));
  }

  return blocks.length > 0 ? blocks : [createBlock()];
}

export function wordCount(blocks: Block[]): number {
  return blocksToPlainText(blocks)
    .split(/\s+/)
    .filter(Boolean).length;
}

/** First line of real text, used as a fallback page title. */
export function deriveTitle(blocks: Block[]): string {
  const first = blocks.find((b) => b.content.trim() && b.type !== "divider");
  return first ? first.content.trim().slice(0, 80) : "";
}
