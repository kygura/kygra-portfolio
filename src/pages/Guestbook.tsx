import { useCallback, useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { GuestbookEntry } from "@/components/GuestbookEntry";
import SectionHead from "@/components/SectionHead";
import { useToast } from "@/hooks/use-toast";



interface Entry {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

const PAGE_SIZE = 12;
const MAX_CHARS = 280;

const Guestbook = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const { toast } = useToast();
  const guestbookAvailable = hasSupabaseConfig && supabase;

  const fetchEntries = useCallback(async (offset = 0) => {
    if (!guestbookAvailable) {
      setEntries([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    try {
      const { data, error } = await guestbookAvailable
        .from('guestbook')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const newEntries = data || [];

      if (offset === 0) {
        setEntries(newEntries);
      } else {
        setEntries(prev => [...prev, ...newEntries]);
      }

      if (newEntries.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: "Error",
        description: "Failed to load guestbook entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [guestbookAvailable, toast]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchEntries(entries.length);
  };

  useEffect(() => {
    if (!guestbookAvailable) {
      setLoading(false);
      setHasMore(false);
      return;
    }

    fetchEntries();

    const channel = guestbookAvailable
      .channel('public:guestbook')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook' }, (payload) => {
        setEntries((current) => {
          if (current.some(e => e.id === payload.new.id)) return current;
          return [payload.new as Entry, ...current];
        });
      })
      .subscribe();

    return () => {
      guestbookAvailable.removeChannel(channel);
    };
  }, [fetchEntries, guestbookAvailable]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (guestbookAvailable && !submitting && !cooldown && message.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();

    if (!guestbookAvailable) {
      toast({
        title: "Guestbook unavailable",
        description: "Guestbook posting is disabled until Supabase is configured.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to sign the guestbook.",
        variant: "destructive",
      });
      return;
    }

    if (cooldown) {
      toast({
        title: "Slow down",
        description: "Please wait a moment before posting again.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const optimisticEntry: Entry = {
        id: `optimistic-${Date.now()}`,
        name: name.trim() || "Anon",
        message: message.trim(),
        created_at: new Date().toISOString(),
      };

      setEntries(prev => [optimisticEntry, ...prev]);
      setMessage("");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);

      const { error } = await guestbookAvailable
        .from('guestbook')
        .insert([
          {
            name: name.trim() || "Anon",
            message: message.trim()
          }
        ]);

      if (error) {
        setEntries(prev => prev.filter(e => e.id !== optimisticEntry.id));
        throw error;
      }

      toast({
        title: "Signed!",
        description: "Thanks for signing the guestbook.",
      });

    } catch (error) {
      console.error('Error submitting entry:', error);
      toast({
        title: "Error",
        description: "Failed to sign the guestbook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(guestbookAvailable) && !submitting && !cooldown && Boolean(message.trim());

  return (
    <>
      <div className="ptitle">
        <p className="mono mute" style={{ marginTop: 0 }}>§04 — Guestbook</p>
        <h1 className="disp">Sign here</h1>
        <p>Leave a mark. Argue with something I wrote. Say you were here.</p>
      </div>

      <SectionHead
        n="04"
        title="Signatures"
        right={loading ? "…" : `${String(entries.length).padStart(2, "0")}${hasMore ? "+" : ""} entries`}
      />

      <div className="gb">
        <div className="gb__form">
          {!guestbookAvailable && (
            <p className="mono mute" style={{ marginBottom: 16 }}>
              The book is closed for now: no Supabase credentials in this environment.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <label className="mono" htmlFor="gb-name">Name · optional</label>
            <input
              id="gb-name"
              placeholder="Anon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!guestbookAvailable}
              maxLength={60}
            />
            <label className="mono" htmlFor="gb-msg">Message</label>
            <textarea
              id="gb-msg"
              placeholder="Write something…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_CHARS}
              disabled={!guestbookAvailable}
            />
            <div className="mono" style={{ display: "flex", alignItems: "center" }}>
              <button type="submit" className="gb__submit" disabled={!canSubmit}>
                {submitting ? "Sending…" : cooldown ? "Signed" : "Sign ↗"}
              </button>
              <span className="gb__count">{message.length}/{MAX_CHARS} · ⌘↵</span>
            </div>
          </form>
        </div>

        <div>
          {loading ? (
            <div className="notice">Opening the book…</div>
          ) : entries.length > 0 ? (
            <>
              {entries.map((entry) => (
                <GuestbookEntry key={entry.id} {...entry} />
              ))}
              {hasMore && (
                <button type="button" className="gb__more mono" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "↓ Load more"}
                </button>
              )}
            </>
          ) : (
            <div className="gb__empty">No signatures yet. The first line is yours.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default Guestbook;
