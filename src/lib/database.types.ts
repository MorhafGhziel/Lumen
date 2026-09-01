/**
 * Shape of the Supabase schema, kept in sync with supabase/schema.sql by hand.
 *
 * Typing the client this way means a renamed column becomes a compile error
 * instead of a runtime `undefined` that quietly writes null to the database.
 *
 * The structure mirrors what `supabase gen types` emits, because postgrest-js
 * matches on it structurally: every table needs Row, Insert, Update *and*
 * Relationships, and empty sections must be `{ [_ in never]: never }` rather
 * than `Record<string, never>`. Get that wrong and every query silently
 * resolves to `never`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type FolderRow = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  is_open: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PageRow = {
  id: string;
  user_id: string;
  title: string;
  /** JSON-serialised Block[]. Stored as text for backwards compatibility. */
  content: string;
  icon: string;
  folder_id: string | null;
  is_favorite: boolean;
  cover_url: string | null;
  is_public: boolean;
  share_id: string;
  sort_order: number;
  /** "doc" or "canvas". */
  kind: string;
  parent_id: string | null;
  /** Set when the page is in the trash. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StickyNoteRow = {
  id: string;
  user_id: string;
  page_id: string | null;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export type DrawStrokeRow = {
  id: string;
  user_id: string;
  page_id: string | null;
  tool: string;
  points: Json;
  color: string;
  size: number;
  opacity: number;
  created_at: string;
}

export type CommentRow = {
  id: string;
  page_id: string;
  user_id: string | null;
  content: string;
  author_name: string;
  created_at: string;
}

/** Columns the database fills in for us are optional on insert. */
type Insertable<Row, Required extends keyof Row = never> = Partial<Row> &
  Pick<Row, Required>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow, "id">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      folders: {
        Row: FolderRow;
        Insert: Insertable<FolderRow, "user_id">;
        Update: Partial<FolderRow>;
        Relationships: [];
      };
      pages: {
        Row: PageRow;
        Insert: Insertable<PageRow, "user_id">;
        Update: Partial<PageRow>;
        Relationships: [];
      };
      sticky_notes: {
        Row: StickyNoteRow;
        Insert: Insertable<StickyNoteRow, "user_id">;
        Update: Partial<StickyNoteRow>;
        Relationships: [];
      };
      drawing_strokes: {
        Row: DrawStrokeRow;
        Insert: Insertable<DrawStrokeRow, "user_id">;
        Update: Partial<DrawStrokeRow>;
        Relationships: [];
      };
      comments: {
        Row: CommentRow;
        Insert: Insertable<CommentRow, "page_id" | "content">;
        Update: Partial<CommentRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
