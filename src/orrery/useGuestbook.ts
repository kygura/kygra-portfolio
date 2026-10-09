// Guestbook data for `05 LOG` (DESIGN A3): pages of 12, realtime inserts, optimistic
// send, 30s cooldown, offline mode when the Supabase env vars are missing. Errors come
// back as Modeline strings; nothing is printed to the console.

import { useCallback, useEffect, useRef, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
import { LOG_PAGE, cooldownLeft, mergeEntries, validateSign, type LogEntry } from "./model.ts";

const TABLE = "guestbook";
const COLUMNS = "id,name,message,created_at";
/** Optimistic entries use this id prefix until the realtime row replaces them. */
const LOCAL = "local-";

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
  /** Last load error as a Modeline string, or null. */
  error: string | null;
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

/** A realtime row replaces the local optimistic copy of the same message. */
function withIncoming(current: LogEntry[], row: LogEntry): LogEntry[] {
  if (current.some((e) => e.id === row.id)) return current;
  const local = current.find((e) => e.id.startsWith(LOCAL) && e.name === row.name && e.message === row.message);
  const rest = local ? current.filter((e) => e !== local) : current;
  return mergeEntries(rest, [row]);
}

export function useGuestbook(): Guestbook {
  const client = hasSupabaseConfig ? supabase : null;
  const [online, setOnline] = useState(Boolean(client));
  const [loading, setLoading] = useState(Boolean(client));
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        if (!alive) return;
        if (!r.ok) {
          setOnline(false);
          setError(r.msg);
        }
      })
      .catch(() => {
        if (alive) {
          setOnline(false);
          setError("E: log offline");
        }
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
    if (!client || !online) return OFFLINE;
    if (busy.current) return { ok: false, msg: "log: busy" };
    busy.current = true;
    try {
      // Server rows already held (realtime inserts included) are exactly the offset of the next page.
      return await fetchPage(entries.filter((e) => !e.id.startsWith(LOCAL)).length);
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
        id: `${LOCAL}${now}`,
        name: v.name,
        message: v.message,
        created_at: new Date(now).toISOString(),
        pending: true,
      };
      const previous = lastSent.current;
      lastSent.current = now;
      setEntries((cur) => mergeEntries(cur, [temp]));

      try {
        const { error: err } = await client.from(TABLE).insert([{ name: v.name, message: v.message }]);
        if (err) throw err;
        setEntries((cur) => cur.map((e) => (e.id === temp.id ? { ...e, pending: false } : e)));
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

  return { online, loading, entries, hasMore, error, more, sign, cooldown };
}
