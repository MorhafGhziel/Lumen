/**
 * Write coalescing for optimistic edits.
 *
 * Fixes three real bugs in the previous store:
 *
 *   1. One shared debounce timer covered every table. Typing in a document and
 *      then dragging a sticky note cancelled the document's pending save, and
 *      the edit was gone.
 *
 *   2. The timer closed over a single `updates` object, so only the last field
 *      touched inside the debounce window was ever written. Change a title and
 *      then the content within 500ms and the title was dropped.
 *
 *   3. New rows rendered under a temporary local id while the insert was still
 *      in flight. Any edit made in that window addressed an id the database had
 *      never seen, and was silently discarded.
 *
 * Each record now owns its own timer and its own accumulated patch, and edits
 * to a not-yet-inserted row queue behind that row's insert.
 */

export type Patch = Record<string, unknown>;

interface Entry {
  timer: ReturnType<typeof setTimeout>;
  patch: Patch;
}

export interface WriterOptions {
  /** How long to wait for typing to settle. */
  waitMs?: number;
  /** Called when a flush fails, so the UI can say so instead of losing data. */
  onError?: (error: unknown, id: string) => void;
}

export class RecordWriter {
  private entries = new Map<string, Entry>();
  /** Temp id → the insert that will produce the permanent id. */
  private inserts = new Map<string, Promise<string | null>>();
  /** Temp id → permanent id, once known. */
  private resolved = new Map<string, string>();

  constructor(
    private readonly flush: (id: string, patch: Patch) => Promise<void>,
    private readonly options: WriterOptions = {},
  ) {}

  /** Registers an in-flight insert so edits made before it lands are not lost. */
  trackInsert(tempId: string, insert: Promise<string | null>): void {
    this.inserts.set(tempId, insert);
    void insert
      .then((realId) => {
        if (realId) this.resolved.set(tempId, realId);
      })
      .catch(() => {
        // Reported by the caller that owns the insert.
      })
      .finally(() => {
        this.inserts.delete(tempId);
      });
  }

  /** Permanent id for a record, or the id itself if it was never temporary. */
  resolve(id: string): string {
    return this.resolved.get(id) ?? id;
  }

  /**
   * Queues a patch. Repeated calls for the same record merge, so no field is
   * lost, and each record's timer is independent of every other record's.
   */
  queue(id: string, patch: Patch): void {
    const existing = this.entries.get(id);
    if (existing) clearTimeout(existing.timer);

    const merged = { ...(existing?.patch ?? {}), ...patch };
    const timer = setTimeout(() => void this.run(id), this.options.waitMs ?? 450);
    this.entries.set(id, { timer, patch: merged });
  }

  private async run(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);

    try {
      if (Object.keys(entry.patch).length === 0) return;

      // If this row is still being inserted, wait for its permanent id first.
      const insert = this.inserts.get(id);
      if (insert) await insert;

      // A temp id with no permanent id means the insert failed. There is no
      // row to patch, and the caller has already surfaced that error.
      if (isTempId(id) && !this.resolved.has(id)) return;

      await this.flush(this.resolve(id), entry.patch);
    } catch (error) {
      this.options.onError?.(error, id);
    }
  }

  /** Writes one record immediately, cancelling its pending timer. */
  async flushNow(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    await this.run(id);
  }

  /** Writes everything outstanding. Used before navigating away. */
  async flushAll(): Promise<void> {
    const ids = [...this.entries.keys()];
    await Promise.all(ids.map((id) => this.flushNow(id)));
  }

  /** True while any write is still pending, for the "Saving…" indicator. */
  get isDirty(): boolean {
    return this.entries.size > 0 || this.inserts.size > 0;
  }

  /** Drops a record's queued write, e.g. when it has just been deleted. */
  cancel(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      this.entries.delete(id);
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) clearTimeout(entry.timer);
    this.entries.clear();
    this.inserts.clear();
    this.resolved.clear();
  }
}

/** Client-side ids for optimistic rows, distinguishable from real UUIDs. */
let counter = 0;
export function tempId(): string {
  counter += 1;
  return `tmp_${counter}_${Date.now().toString(36)}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith("tmp_");
}
