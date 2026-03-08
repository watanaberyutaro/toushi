import { useState, useEffect, useCallback } from "react";
import { WatchlistItem } from "@/types";
import { DEFAULT_WATCHLIST } from "@/lib/mock-data";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.length > 0 ? data : DEFAULT_WATCHLIST);
      } else {
        setWatchlist(DEFAULT_WATCHLIST);
      }
    } catch {
      setWatchlist(DEFAULT_WATCHLIST);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addSymbol = useCallback(
    async (symbol: string, name: string, type: WatchlistItem["type"]) => {
      try {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, name, type }),
        });
        if (res.ok) {
          const newItem = await res.json();
          setWatchlist((prev) => [...prev, newItem]);
          return newItem;
        }
      } catch {}

      // Fallback
      const newItem: WatchlistItem = {
        id: Date.now().toString(),
        symbol,
        name,
        type,
        createdAt: new Date().toISOString(),
      };
      setWatchlist((prev) => [...prev, newItem]);
      return newItem;
    },
    []
  );

  const removeSymbol = useCallback(async (id: string) => {
    try {
      await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    } catch {}
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { watchlist, isLoading, addSymbol, removeSymbol, refresh: fetchWatchlist };
}
