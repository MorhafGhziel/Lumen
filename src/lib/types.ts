export type AppMode = "docs" | "canvas";

/* ── Folders ── */
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  is_open: boolean;
  sort_order: number;
  created_at: number;
}

/* ── Pages ── */
export interface DocPage {
  id: string;
  title: string;
  /** JSON-serialised Block[]. */
  content: string;
  icon: string;
  folder_id: string | null;
  is_favorite: boolean;
  cover_url: string | null;
  is_public: boolean;
  share_id: string;
  created_at: number;
  updated_at: number;
}

/* ── Blocks ── */
export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bulleted_list"
  | "numbered_list"
  | "todo"
  | "toggle"
  | "quote"
  | "callout"
  | "divider"
  | "code"
  | "image";

/** Accent applied to a callout. */
export type CalloutTone = "neutral" | "flame" | "sky" | "sprout" | "iris";

export interface Block {
  id: string;
  type: BlockType;
  /**
   * Inline HTML, limited to the allowlist in lib/richtext. Plain text from
   * before rich text existed remains valid, since text with no tags renders
   * identically.
   */
  content: string;
  checked?: boolean;
  /** Toggle blocks only: whether the body is folded away. */
  collapsed?: boolean;
  /** Toggle blocks only: the folded content. */
  children?: Block[];
  imageUrl?: string;
  /** Caption or alt text for image blocks. */
  caption?: string;
  language?: string;
  tone?: CalloutTone;
}

/* ── Comments ── */
export interface Comment {
  id: string;
  page_id: string;
  user_id: string | null;
  content: string;
  author_name: string;
  created_at: number;
}

/* ── Canvas ── */
/**
 * Named after paper stocks rather than raw hues. The old names (yellow, pink,
 * blue…) described the light theme only and made no sense once dark mode
 * turned them into deep muted tones.
 */
export type StickyColor = "butter" | "blush" | "sky" | "sage" | "lilac" | "clay";

export const STICKY_COLORS: StickyColor[] = [
  "butter",
  "blush",
  "sky",
  "sage",
  "lilac",
  "clay",
];

export interface StickyNote {
  id: string;
  text: string;
  color: StickyColor;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
}

/* ── Drawing ── */
export type DrawTool = "pen" | "highlighter" | "eraser";

export interface DrawPoint {
  x: number;
  y: number;
  /** Stylus pressure, 0–1. Falls back to 0.5 for mouse and touch. */
  p?: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawTool;
  points: DrawPoint[];
  color: string;
  size: number;
  opacity: number;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

/* ── AI ── */
export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** True while the response is still streaming in. */
  streaming?: boolean;
  error?: boolean;
}

export type AiAction =
  | "summarize"
  | "expand"
  | "improve"
  | "brainstorm"
  | "fix"
  | "outline";

/* ── Sync status, surfaced in the UI ── */
export type SyncStatus = "idle" | "saving" | "saved" | "error" | "offline";
