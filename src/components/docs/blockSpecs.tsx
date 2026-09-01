import {
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
  SquareCheck,
  Type,
} from "lucide-react";
import type { BlockType } from "@/lib/types";

/**
 * The catalogue of block types.
 *
 * Kept in one place because four things need to agree on it: the insert menu,
 * the turn-into menu, the markdown shortcuts and the renderer. When they lived
 * separately they drifted.
 *
 * `keywords` is what makes the insert menu findable — people look for "bullet"
 * and "ul" far more often than they look for "bulleted list".
 */
export interface BlockSpec {
  type: BlockType;
  label: string;
  hint: string;
  Icon: LucideIcon;
  group: string;
  keywords: string[];
  /** Typed prefix that converts the block, e.g. "# " for a heading. */
  shortcut?: string;
}

export const BLOCK_SPECS: BlockSpec[] = [
  {
    type: "text",
    label: "Text",
    hint: "Plain paragraph",
    Icon: Type,
    group: "Basic",
    keywords: ["text", "paragraph", "plain", "body", "p"],
  },
  {
    type: "h1",
    label: "Heading 1",
    hint: "Section title",
    Icon: Heading1,
    group: "Basic",
    keywords: ["h1", "heading", "title", "large"],
    shortcut: "# ",
  },
  {
    type: "h2",
    label: "Heading 2",
    hint: "Subsection",
    Icon: Heading2,
    group: "Basic",
    keywords: ["h2", "heading", "subtitle", "medium"],
    shortcut: "## ",
  },
  {
    type: "h3",
    label: "Heading 3",
    hint: "Minor heading",
    Icon: Heading3,
    group: "Basic",
    keywords: ["h3", "heading", "small"],
    shortcut: "### ",
  },
  {
    type: "todo",
    label: "To-do",
    hint: "Checkbox item",
    Icon: SquareCheck,
    group: "Lists",
    keywords: ["todo", "task", "checkbox", "check", "tick", "done"],
    shortcut: "[] ",
  },
  {
    type: "bulleted_list",
    label: "Bulleted list",
    hint: "Unordered points",
    Icon: List,
    group: "Lists",
    keywords: ["bullet", "list", "ul", "unordered", "point", "dash"],
    shortcut: "- ",
  },
  {
    type: "numbered_list",
    label: "Numbered list",
    hint: "Ordered steps",
    Icon: ListOrdered,
    group: "Lists",
    keywords: ["number", "numbered", "list", "ol", "ordered", "step"],
    shortcut: "1. ",
  },
  {
    type: "toggle",
    label: "Toggle",
    hint: "Collapsible section",
    Icon: ChevronRight,
    group: "Lists",
    keywords: ["toggle", "collapse", "accordion", "details", "fold", "expand"],
    shortcut: "> ",
  },
  {
    type: "quote",
    label: "Quote",
    hint: "Set apart",
    Icon: Quote,
    group: "Blocks",
    keywords: ["quote", "blockquote", "cite", "citation"],
    shortcut: '" ',
  },
  {
    type: "callout",
    label: "Callout",
    hint: "Highlighted note",
    Icon: Info,
    group: "Blocks",
    keywords: ["callout", "note", "info", "warning", "aside", "tip"],
  },
  {
    type: "code",
    label: "Code",
    hint: "Monospaced block",
    Icon: Code2,
    group: "Blocks",
    keywords: ["code", "snippet", "pre", "monospace", "terminal"],
    shortcut: "```",
  },
  {
    type: "image",
    label: "Image",
    hint: "Upload or drop a file",
    Icon: ImageIcon,
    group: "Media",
    keywords: ["image", "picture", "photo", "img", "upload", "media"],
  },
  {
    type: "divider",
    label: "Divider",
    hint: "Horizontal rule",
    Icon: Minus,
    group: "Media",
    keywords: ["divider", "rule", "hr", "line", "separator", "break"],
    shortcut: "---",
  },
];

export const SPEC_BY_TYPE = new Map(BLOCK_SPECS.map((spec) => [spec.type, spec]));

/** Types where Enter should continue the same kind of block. */
export const CONTINUES = new Set<BlockType>(["bulleted_list", "numbered_list", "todo"]);

/** Types that hold no editable text of their own. */
export const VOID_TYPES = new Set<BlockType>(["divider", "image"]);
