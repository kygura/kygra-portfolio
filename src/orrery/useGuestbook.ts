// Guestbook data for `05 LOG` (DESIGN A3): pages of 12, realtime inserts, optimistic
// send, 30s cooldown, offline mode when the Supabase env vars are missing or the first read
// fails (`more()` retries it). Errors come back as Modeline strings; nothing is printed to the
// console. The checks here are UX only; the database enforces the real limits.

import { useCallback, useEffect, useRef, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
import { LOG_LOCAL, LOG_PAGE, confirmEntry, cooldownLeft, mergeEntries, validateSign, withIncoming, type LogEntry } from "./model.ts";

const TABLE = "guestbook";
const COLUMNS = "id,name,message,created_at";

export interface LogReply {
  ok: boolean;
  /** Modeline text (`E: ...` when `ok` is false). */
  msg: string;
}

export interface Guestbook {
  online: boolean;
  loading: boolean;
  entries: LogEntry[];
  hasMore: boolean;
  /** Next page; while offline after a failed first read, retries that read instead. */
  more(): Promise<LogReply>;
  sign(name: string, message: string): Promise<LogReply>;
  /** Milliseconds until the next send is allowed. */
  cooldown(): number;
}

const OFFLINE: LogReply = { ok: false, msg: "E: log offline" };

const asEntry = (row: Record<string, unknown>): LogEntry => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  message: String(row.message ?? ""),
  created_at: String(row.created_at ?? ""),
});

export function useGuestbook(): Guestbook {
  const client = hasSupabaseConfig ? supabase : null;
  const [online, setOnline] = useState(Boolean(client));
  const [loading, setLoading] = useState(Boolean(client));
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const lastSent = useRef<number | null>(null);
  const busy = useRef(false);

  const fetchPage = useCallback(
    async (offset: number): Promise<LogReply> => {
      if (!client) return OFFLINE;
      // One extra row tells whether another page exists.
      const { data, error: err } = await client
        .from(TABLE)
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .range(offset, offset + LOG_PAGE);
      if (err || !data) return { ok: false, msg: "E: log read failed" };
      const page = (data as Record<string, unknown>[]).slice(0, LOG_PAGE).map(asEntry);
      setHasMore(data.length > LOG_PAGE);
      setEntries((cur) => mergeEntries(cur, page));
      return { ok: true, msg: page.length ? `log +${page.length}` : "log: end" };
    },
    [client],
  );

  useEffect(() => {
    if (!client) return;
    let alive = true;
    fetchPage(0)
      .then((r) => {
        if (alive && !r.ok) setOnline(false);
      })
      .catch(() => {
        if (alive) setOnline(false);
      })
      .finally(() => alive && setLoading(false));

    const channel = client
      .channel("public:guestbook")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, (payload) => {
        const row = asEntry(payload.new as Record<string, unknown>);
        setEntries((cur) => withIncoming(cur, row));
      })
      .subscribe();

    return () => {
      alive = false;
      void client.removeChannel(channel);
    };
  }, [client, fetchPage]);

  const more = useCallback(async (): Promise<LogReply> => {
    if (!client) return OFFLINE;
    if (busy.current) return { ok: false, msg: "log: busy" };
    busy.current = true;
    try {
      if (!online) {
        // The first read failed: try it again rather than staying offline for the session.
        const r = await fetchPage(0);
        if (r.ok) setOnline(true);
        return r;
      }
      // Server rows already held (realtime inserts included) are exactly the offset of the next page.
      return await fetchPage(entries.filter((e) => !e.id.startsWith(LOG_LOCAL)).length);
    } catch {
      return { ok: false, msg: "E: log read failed" };
    } finally {
      busy.current = false;
    }
  }, [client, online, fetchPage, entries]);

  const sign = useCallback(
    async (name: string, message: string): Promise<LogReply> => {
      if (!client || !online) return OFFLINE;
      const now = Date.now();
      const wait = cooldownLeft(lastSent.current, now);
      if (wait > 0) return { ok: false, msg: `E: cooldown ${Math.ceil(wait / 1000)}s` };
      const v = validateSign(name, message);
      if (v.ok === false) return { ok: false, msg: v.error };

      const temp: LogEntry = {
        id: `${LOG_LOCAL}${now}`,
        name: v.name,
        message: v.message,
        created_at: new Date(now).toISOString(),
        pending: true,
      };
      const previous = lastSent.current;
      lastSent.current = now;
      setEntries((cur) => mergeEntries(cur, [temp]));

      try {
        const { data, error: err } = await client
          .from(TABLE)
          .insert([{ name: v.name, message: v.message }])
          .select("id,created_at")
          .single();
        if (err || !data) throw err;
        // Swap in the server row now, so the entry is confirmed even without realtime.
        const row: LogEntry = { ...temp, id: String(data.id), created_at: String(data.created_at), pending: false };
        setEntries((cur) => confirmEntry(cur, temp.id, row));
        return { ok: true, msg: `signed as ${v.name}` };
      } catch {
        lastSent.current = previous;
        setEntries((cur) => cur.filter((e) => e.id !== temp.id));
        return { ok: false, msg: "E: log write failed" };
      }
    },
    [client, online],
  );

  const cooldown = useCallback(() => cooldownLeft(lastSent.current, Date.now()), []);

  return { online, loading, entries, hasMore, more, sign, cooldown };
}
