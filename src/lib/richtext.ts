/**
 * Inline rich text.
 *
 * Blocks store a small, fixed subset of HTML so text can carry bold, italic,
 * links and highlights. Everything written by the editor and everything read
 * back out goes through sanitizeInline first.
 *
 * The sanitizer escapes the entire string and then re-permits an explicit
 * allowlist. Doing it in that order is what makes it safe: anything the
 * allowlist does not match stays escaped, so a tag this file has never heard
 * of cannot survive. A stripper that walks the string looking for bad tags has
 * to be right about every attack; this has to be right about ten patterns.
 *
 * It also has to run on the server, because shared pages are server rendered
 * and DOMParser does not exist in Node.
 */

export const INLINE_MARKS = ["bold", "italic", "underline", "strike", "code", "highlight"] as const;
export type InlineMark = (typeof INLINE_MARKS)[number];

/** The single tag each mark is stored as. */
export const MARK_TAG: Record<InlineMark, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
  code: "code",
  highlight: "mark",
};

/** document.execCommand name for each mark, where one exists. */
export const MARK_COMMAND: Record<InlineMark, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strike: "strikethrough",
  code: "", // handled manually; execCommand has no inline-code equivalent
  highlight: "", // handled manually
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only schemes that cannot execute script. */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  // A bare domain is the common case when someone pastes without a scheme.
  if (/^[\w-]+(\.[\w-]+)+([/?#]\S*)?$/.test(url)) return `https://${url}`;
  return null;
}

const SIMPLE_TAGS = ["strong", "em", "u", "s", "code", "mark"];

/**
 * Escape everything, then re-permit the allowlist.
 *
 * b/i are normalised to strong/em, because execCommand emits the presentational
 * pair and there is no reason to store both spellings.
 */
export function sanitizeInline(input: string): string {
  if (!input) return "";

  let html = escapeHtml(input);

  // Normalise the presentational tags execCommand produces.
  html = html
    .replace(/&lt;(\/?)b&gt;/gi, "&lt;$1strong&gt;")
    .replace(/&lt;(\/?)i&gt;/gi, "&lt;$1em&gt;")
    .replace(/&lt;(\/?)strike&gt;/gi, "&lt;$1s&gt;")
    .replace(/&lt;(\/?)del&gt;/gi, "&lt;$1s&gt;");

  for (const tag of SIMPLE_TAGS) {
    html = html
      .replace(new RegExp(`&lt;${tag}&gt;`, "gi"), `<${tag}>`)
      .replace(new RegExp(`&lt;/${tag}&gt;`, "gi"), `</${tag}>`);
  }

  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br>");

  // Anchors keep only href, and only if the scheme is safe.
  html = html.replace(
    /&lt;a\s+[^&]*?href=&quot;([^&]*?)&quot;[^&]*?&gt;/gi,
    (match, href: string) => {
      const safe = safeHref(decodeEntities(href));
      return safe
        ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer nofollow">`
        : "";
    },
  );
  html = html.replace(/&lt;\/a&gt;/gi, "</a>");

  return closeDanglingTags(html);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Balances tags.
 *
 * A half-deleted selection can leave an unclosed <strong>, which would
 * otherwise bold the rest of the document from that point on.
 */
function closeDanglingTags(html: string): string {
  const open: string[] = [];
  const pattern = /<(\/?)(strong|em|u|s|code|mark|a)\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const [, closing, tag] = match;
    const name = tag.toLowerCase();
    if (closing) {
      const index = open.lastIndexOf(name);
      if (index !== -1) open.splice(index, 1);
    } else {
      open.push(name);
    }
  }

  return html + open.reverse().map((tag) => `</${tag}>`).join("");
}

/** Readable text, for word counts, search, AI prompts and titles. */
export function inlineToPlainText(html: string): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).trim();
}

/** Plain text promoted to inline HTML, for pasted or AI-generated content. */
export function plainTextToInline(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

/** True when the selection sits inside the given tag. */
export function selectionHasMark(mark: InlineMark): boolean {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  let node: Node | null = selection.anchorNode;
  const tag = MARK_TAG[mark].toUpperCase();

  while (node) {
    if (node.nodeType === 1) {
      const element = node as HTMLElement;
      if (element.tagName === tag) return true;
      if (element.isContentEditable && element.dataset.blockRoot === "true") break;
    }
    node = node.parentNode;
  }
  return false;
}

/** The anchor the selection sits inside, if any. */
export function selectionLink(): HTMLAnchorElement | null {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  let node: Node | null = selection.anchorNode;
  while (node) {
    if (node.nodeType === 1 && (node as HTMLElement).tagName === "A") {
      return node as HTMLAnchorElement;
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * Wraps or unwraps the selection in a tag.
 *
 * execCommand covers bold, italic, underline and strikethrough in every
 * browser that matters. Code and highlight have no command, so they are
 * applied by hand: unwrap if already inside the tag, otherwise surround.
 */
export function toggleMark(mark: InlineMark): void {
  const command = MARK_COMMAND[mark];
  if (command) {
    document.execCommand(command, false);
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const tag = MARK_TAG[mark];

  if (selectionHasMark(mark)) {
    // Unwrap: replace the element with its own children.
    let node: Node | null = selection.anchorNode;
    while (node) {
      if (node.nodeType === 1 && (node as HTMLElement).tagName === tag.toUpperCase()) {
        const element = node as HTMLElement;
        const parent = element.parentNode;
        if (parent) {
          while (element.firstChild) parent.insertBefore(element.firstChild, element);
          parent.removeChild(element);
        }
        return;
      }
      node = node.parentNode;
    }
    return;
  }

  const range = selection.getRangeAt(0);
  const wrapper = document.createElement(tag);
  try {
    range.surroundContents(wrapper);
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(wrapper);
    selection.addRange(next);
  } catch {
    // surroundContents throws when the selection straddles element boundaries.
    // Falling back to insertHTML keeps the action working on partial selections.
    document.execCommand("insertHTML", false, `<${tag}>${selection.toString()}</${tag}>`);
  }
}

/** Applies or replaces a link on the current selection. */
export function applyLink(url: string): void {
  const safe = safeHref(url);
  if (!safe) return;
  document.execCommand("createLink", false, safe);

  // execCommand cannot set attributes, so harden the anchor afterwards.
  const anchor = selectionLink();
  if (anchor) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer nofollow";
  }
}

export function removeLink(): void {
  document.execCommand("unlink", false);
}
