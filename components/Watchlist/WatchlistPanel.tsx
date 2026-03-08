"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { Plus, Bell, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { convertPrice, formatPrice, currencySymbol, needsConversion } from "@/lib/currency";

interface Quote {
  price: number;
  change: number;
  changePercent: number;
}

export default function WatchlistPanel() {
  const {
    watchlist,
    selectedSymbol,
    setSelectedSymbol,
    toggleAlerts,
    toggleAddSymbol,
    currency,
    usdJpyRate,
  } = useAppStore();

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);

    // 全銘柄を1回のAPIコールでまとめて取得（レート制限対策）
    try {
      const symbols = watchlist.map((w) => w.symbol).join(",");
      const res = await fetch(`/api/market-data/quotes?symbols=${encodeURIComponent(symbols)}`);
      if (res.ok) {
        const data: Record<string, Quote> = await res.json();
        setQuotes(data);
      }
    } catch {}

    setLoading(false);
  }, [watchlist]);

  // 初回 & ウォッチリスト変化時に取得
  useEffect(() => {
    fetchQuotes();
  }, [watchlist.length]); // watchlist.lengthが変わったときだけ再取得

  // 1分ごとに自動更新
  useEffect(() => {
    const timer = setInterval(fetchQuotes, 60000);
    return () => clearInterval(timer);
  }, [fetchQuotes]);

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            ウォッチリスト
          </span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green live-dot" />
            <span className="text-xs text-text-muted">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchQuotes}
            disabled={loading}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title="価格を更新"
          >
            <RefreshCw size={13} className={clsx(loading && "animate-spin")} />
          </button>
          <button
            onClick={toggleAlerts}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title="アラート一覧"
          >
            <Bell size={14} />
          </button>
          <button
            onClick={toggleAddSymbol}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title="銘柄追加"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {watchlist.map((item) => {
          const quote = quotes[item.symbol];
          const isSelected = selectedSymbol?.symbol === item.symbol;
          const isPositive = (quote?.changePercent ?? 0) >= 0;

          return (
            <button
              key={item.id}
              onClick={() =>
                setSelectedSymbol({
                  id: item.id,
                  symbol: item.symbol,
                  name: item.name,
                  type: item.type,
                  price: quote?.price,
                  change: quote?.change,
                  changePercent: quote?.changePercent,
                })
              }
              className={clsx(
                "w-full flex items-center justify-between px-3 py-2 border-b border-border/50 transition-colors text-left",
                isSelected
                  ? "bg-accent-blue/10 border-l-2 border-l-accent-blue"
                  : "hover:bg-bg-hover"
              )}
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "text-xs font-mono font-semibold",
                    isSelected ? "text-accent-blue" : "text-text-primary"
                  )}>
                    {item.symbol}
                  </span>
                  <span className={clsx(
                    "text-xs px-1 rounded font-mono",
                    item.type === "crypto" ? "bg-accent-yellow/20 text-accent-yellow" :
                    item.type === "forex"  ? "bg-purple-500/20 text-purple-400" :
                    item.type === "etf"    ? "bg-accent-green/20 text-accent-green" :
                                            "bg-accent-blue/20 text-accent-blue"
                  )}>
                    {item.type === "crypto" ? "CRYPTO" :
                     item.type === "forex"  ? "FX" :
                     item.type === "etf"    ? "ETF" : "STOCK"}
                  </span>
                </div>
                <span className="text-xs text-text-muted truncate mt-0.5">{item.name}</span>
              </div>

              <div className="flex flex-col items-end ml-2 min-w-[80px]">
                {quote ? (
                  <>
                    <span className="text-sm font-mono font-semibold text-text-primary">
                      {(() => {
                        const canConvert = needsConversion(item.symbol, item.type);
                        const dispCurrency = canConvert ? currency : "USD";
                        const dispPrice = convertPrice(quote.price, currency, usdJpyRate, item.symbol, item.type);
                        return `${currencySymbol(dispCurrency)}${formatPrice(dispPrice, item.symbol, dispCurrency)}`;
                      })()}
                    </span>
                    <div className={clsx(
                      "flex items-center gap-1 text-xs font-mono",
                      isPositive ? "text-accent-green" : "text-accent-red"
                    )}>
                      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      <span>{isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%</span>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-text-muted font-mono animate-pulse">読込中...</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
