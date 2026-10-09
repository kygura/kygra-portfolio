import { useCallback, useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { GuestbookEntry } from "@/components/GuestbookEntry";
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

  return (
    <div className="sheet page">
      <div className="session">
        <span className="session__num">Sheet <em>04</em></span>
        <h1>Guestbook</h1>
        <span className="session__hint">signed notes · newest first</span>
      </div>
      <p className="page-lede">
        {guestbookAvailable
          ? "Leave a mark here."
          : "The guestbook is temporarily unavailable because Supabase credentials are not configured for this environment."}
      </p>

      <form onSubmit={handleSubmit} className="titleblock gb-form">
        <label>
          <b>Name</b>
          <input
            placeholder="optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!guestbookAvailable}
          />
        </label>
        <div>
          <label>
            <b>Note</b>
            <textarea
              placeholder="Leave a message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_CHARS}
              rows={3}
              disabled={!guestbookAvailable}
            />
          </label>
          <div className="gb-form__count">
            <span><kbd>ctrl</kbd><kbd>enter</kbd>to sign</span>
            <span>{message.length}/{MAX_CHARS}</span>
          </div>
        </div>
        <div className="gb-form__sign">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!guestbookAvailable || submitting || cooldown || !message.trim()}
          >
            {submitting ? "Sending…" : "Sign"}
          </button>
        </div>
      </form>

      <div className="session">
        <span className="session__num">Plate <em>II</em></span>
        <h2>Signatures</h2>
      </div>
      <section className="plate">
        <table className="ledger gb-ledger">
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} aria-hidden="true">
                  <td className="ledger__fig">—</td>
                  <td className="ledger__state">—</td>
                </tr>
              ))
            ) : entries.length > 0 ? (
              entries.map((entry) => (
                <GuestbookEntry key={entry.id} {...entry} />
              ))
            ) : (
              <tr>
                <td className="ledger__state">No entries yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {!loading && hasMore && entries.length > 0 && (
        <button type="button" className="text-btn" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more ↓"}
        </button>
      )}
    </div>
  );
};

export default Guestbook;
