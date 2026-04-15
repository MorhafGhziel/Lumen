export type AppMode = "docs" | "canvas";

/* ── Folders ── */
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id?: string;
  is_open: boolean;
  created_at: number;
}

/* ── Docs Mode ── */
export interface DocPage {
  id: string;
  title: string;
  content: string;
  icon: string;
  folder_id: string | null;
  is_favorite: boolean;
  cover_url: string | null;
  is_public: boolean;
  share_id: string | null;
  user_id?: string;
  createdAt: number;
  updatedAt: number;
}

/* ── Blocks ── */
export type BlockType =
  | "text" | "h1" | "h2" | "h3"
  | "bulleted_list" | "numbered_list" | "todo"
  | "quote" | "callout" | "divider" | "code" | "image";

export interface BlockComment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  color?: string;
  bgColor?: string;
  imageUrl?: string;
  comments?: BlockComment[];
}

/* ── Comments ── */
export interface Comment {
  id: string;
  user_id: string;
  page_id: string;
  content: string;
  user_email: string;
  created_at: number;
}

/* ── Canvas Mode ── */
export type StickyColor = "yellow" | "pink" | "blue" | "green" | "purple" | "orange";

export interface StickyNote {
  id: string;
  text: string;
  color: StickyColor;
  x: number;
  y: number;
  width: number;
  height: number;
  user_id?: string;
}

/* ── Drawing ── */
export type DrawTool = "pen" | "eraser" | "highlighter";

export interface DrawPoint {
  x: number;
  y: number;
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
}
