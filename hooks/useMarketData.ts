import { useState, useEffect, useCallback } from "react";
import { OHLCVData } from "@/types";

interface UseMarketDataOptions {
  symbol: string;
  interval: string;
  outputsize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface MarketDataState {
  data: OHLCVData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useMarketData({
  symbol,
  interval,
  outputsize = 200,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseMarketDataOptions): MarketDataState & { refresh: () => void } {
  const [state, setState] = useState<MarketDataState>({
    data: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    if (!symbol) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(
        `/api/market-data/time-series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}`
      );
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setState({
        data,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch data",
      }));
    }
  }, [symbol, interval, outputsize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchData, refreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { ...state, refresh: fetchData };
}

export function useQuote(symbol: string) {
  const [quote, setQuote] = useState<{
    price: number;
    change: number;
    changePercent: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(symbol)}`);
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
        }
      } catch {}
      setIsLoading(false);
    };

    fetchQuote();
    const timer = setInterval(fetchQuote, 30000); // Refresh every 30s
    return () => clearInterval(timer);
  }, [symbol]);

  return { quote, isLoading };
}
