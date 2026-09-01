import { createElement } from "react";
import {
  BookMarked,
  Bookmark,
  Camera,
  Check,
  ClipboardList,
  Code,
  Compass,
  FileText,
  Flag,
  Globe,
  Heart,
  Lightbulb,
  Map as MapIcon,
  MessageCircle,
  Music,
  Notebook,
  Paperclip,
  Pencil,
  PenLine,
  Pin,
  Rocket,
  Star,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * The set a page can be labelled with.
 *
 * Deliberately a fixed list of line icons rather than an emoji picker: emoji
 * render differently on every platform and pull a system font into a page that
 * is otherwise carefully set. These inherit currentColor and stay consistent.
 */
export const PAGE_ICONS: { name: string; Icon: LucideIcon; label: string }[] = [
  { name: "file", Icon: FileText, label: "Document" },
  { name: "canvas", Icon: PenLine, label: "Canvas" },
  { name: "pencil", Icon: Pencil, label: "Draft" },
  { name: "notebook", Icon: Notebook, label: "Notebook" },
  { name: "clipboard", Icon: ClipboardList, label: "List" },
  { name: "check", Icon: Check, label: "Tasks" },
  { name: "lightbulb", Icon: Lightbulb, label: "Idea" },
  { name: "target", Icon: Target, label: "Goal" },
  { name: "flag", Icon: Flag, label: "Milestone" },
  { name: "rocket", Icon: Rocket, label: "Launch" },
  { name: "map", Icon: MapIcon, label: "Plan" },
  { name: "compass", Icon: Compass, label: "Direction" },
  { name: "book", Icon: BookMarked, label: "Reference" },
  { name: "bookmark", Icon: Bookmark, label: "Saved" },
  { name: "star", Icon: Star, label: "Important" },
  { name: "heart", Icon: Heart, label: "Personal" },
  { name: "zap", Icon: Zap, label: "Quick" },
  { name: "message", Icon: MessageCircle, label: "Notes" },
  { name: "pin", Icon: Pin, label: "Pinned" },
  { name: "paperclip", Icon: Paperclip, label: "Attached" },
  { name: "globe", Icon: Globe, label: "Public" },
  { name: "code", Icon: Code, label: "Code" },
  { name: "music", Icon: Music, label: "Music" },
  { name: "camera", Icon: Camera, label: "Media" },
];

const BY_NAME = new Map(PAGE_ICONS.map((entry) => [entry.name, entry.Icon]));

export function PageIcon({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  // createElement rather than <Icon />: the icon is looked up from a static
  // table, not defined here, and JSX in a capitalised local reads to the React
  // compiler as a component being declared inside render.
  return createElement(BY_NAME.get(name) ?? FileText, {
    className,
    strokeWidth,
    "aria-hidden": true,
  });
}
