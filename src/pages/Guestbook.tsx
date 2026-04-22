import { useCallback, useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { GuestbookEntry } from "@/components/GuestbookEntry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SendHorizontal, ArrowDown } from "lucide-react";



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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { error } = await guestbookAvailable
        .from('guestbook')
        .insert([
          {
            name: name.trim() || "Anonymous",
            message: message.trim()
          }
        ]);

      if (error) throw error;

      setMessage("");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000); // 30s cooldown

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
    <div className="px-6 md:px-12 lg:px-16 py-12 max-w-3xl mx-auto flex flex-col min-h-screen">
      <div className="prose-minimal animate-fade-in flex-grow">
        <h1 className="text-5xl md:text-6xl font-display font-light mb-4">
          Guestbook
        </h1>

        <p className="text-lg font-light text-muted-foreground mb-8">
          Leave a mark here.
        </p>

        {!guestbookAvailable && (
          <Card className="mb-6 border-dashed border-muted bg-card/30 shadow-sm">
            <CardContent className="py-4 text-sm text-muted-foreground">
              The guestbook is temporarily unavailable because Supabase credentials are not configured for this environment.
            </CardContent>
          </Card>
        )}

        <Card className="mb-12 border-muted bg-card/40 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!guestbookAvailable}
                  className="bg-background/50 border-muted sm:max-w-xs"
                />
              </div>
              <div className="relative">
                <AutosizeTextarea
                  placeholder="Leave a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_CHARS}
                  minRows={3}
                  maxRows={8}
                  disabled={!guestbookAvailable}
                  className="w-full bg-background/50 border-muted pb-8 resize-none"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground pointer-events-none select-none">
                  {message.length}/{MAX_CHARS}
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={!guestbookAvailable || submitting || cooldown || !message.trim()}
                  className="w-full sm:w-auto px-8"
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</>
                  ) : (
                    <><SendHorizontal className="mr-2 h-4 w-4" /> Post Entry</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-light text-foreground/70 mb-4">Signatures</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 w-full bg-muted/10 animate-pulse rounded-lg border border-muted/20" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <GuestbookEntry key={entry.id} {...entry} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="ghost"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {loadingMore ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowDown className="mr-2 h-4 w-4" />
                    )}
                    Load more
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-muted rounded-lg bg-card/20">
              <p>No entries yet.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Guestbook;
