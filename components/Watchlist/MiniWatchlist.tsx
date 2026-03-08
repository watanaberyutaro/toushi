"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { convertPrice, formatPrice, currencySymbol, needsConversion } from "@/lib/currency";

interface Quote {
  price: number;
  change: number;
  changePercent: number;
}

const TYPE_LABELS: Record<string, string> = {
  stock: "株式",
  crypto: "仮想通貨",
  forex: "FX",
  etf: "ETF",
};

const TYPE_COLORS: Record<string, string> = {
  stock: "text-accent-blue",
  crypto: "text-accent-yellow",
  forex: "text-purple-400",
  etf: "text-accent-green",
};

const TYPE_BG: Record<string, string> = {
  stock: "bg-accent-blue/10",
  crypto: "bg-accent-yellow/10",
  forex: "bg-purple-400/10",
  etf: "bg-accent-green/10",
};

function pricesToSvgPath(prices: number[]): string {
  if (prices.length < 2) return "";
  const W = 52, H = 20;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const n = prices.length - 1;
  return prices
    .map((p, i) => {
      const x = ((i / n) * W).toFixed(1);
      const y = (H - ((p - min) / range) * (H - 2) - 1).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export default function MiniWatchlist() {
  const { watchlist, selectedSymbol, setSelectedSymbol, currency, usdJpyRate } = useAppStore();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    try {
      const symbols = watchlist.map((w) => w.symbol).join(",");
      const res = await fetch(`/api/market-data/quotes?symbols=${encodeURIComponent(symbols)}`);
      if (res.ok) setQuotes(await res.json());
    } catch {}
    setLoading(false);
  }, [watchlist]);

  const fetchSparklines = useCallback(async () => {
    if (watchlist.length === 0) return;
    try {
      const symbols = watchlist.map((w) => w.symbol).join(",");
      const res = await fetch(`/api/market-data/sparklines?symbols=${encodeURIComponent(symbols)}`);
      if (res.ok) setSparklines(await res.json());
    } catch {}
  }, [watchlist]);

  useEffect(() => {
    fetchQuotes();
    fetchSparklines();
  }, [watchlist.length]);

  useEffect(() => {
    const quoteTimer = setInterval(fetchQuotes, 60_000);
    const sparkTimer = setInterval(fetchSparklines, 5 * 60_000);
    return () => { clearInterval(quoteTimer); clearInterval(sparkTimer); };
  }, [fetchQuotes, fetchSparklines]);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border flex-none">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          ウォッチリスト
        </span>
        <button
          onClick={() => { fetchQuotes(); fetchSparklines(); }}
          disabled={loading}
          className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
        >
          <RefreshCw size={10} className={clsx(loading && "animate-spin")} />
        </button>
      </div>

      {/* 縦リスト */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "thin" }}>
        {watchlist.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-text-muted px-4 text-center">
            ウォッチリストに銘柄を追加してください
          </div>
        ) : (
          watchlist.map((item) => {
            const quote = quotes[item.symbol];
            const isSelected = selectedSymbol?.symbol === item.symbol;
            const isPositive = (quote?.changePercent ?? 0) >= 0;
            const canConvert = needsConversion(item.symbol, item.type);
            const dispCurrency = canConvert ? currency : "USD";
            const dispPrice = quote
              ? convertPrice(quote.price, currency, usdJpyRate, item.symbol, item.type)
              : 0;
            const sparkPrices = sparklines[item.symbol];
            const sparkPath = sparkPrices ? pricesToSvgPath(sparkPrices) : "";

            return (
              <button
                key={item.id}
                onClick={() => setSelectedSymbol({ id: item.id, symbol: item.symbol, name: item.name, type: item.type })}
                className={clsx(
                  "flex items-center w-full px-3 py-2 border-b border-border/40 hover:bg-bg-hover transition-colors text-left",
                  isSelected && "bg-accent-blue/5 border-l-2 border-l-accent-blue"
                )}
              >
                {/* 左：シンボル + 日本語名 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx("text-xs font-mono font-bold", isSelected ? "text-accent-blue" : TYPE_COLORS[item.type] ?? "text-text-primary")}>
                      {item.symbol}
                    </span>
                    <span className={clsx("text-[9px] px-1 py-0.5 rounded font-semibold", TYPE_COLORS[item.type], TYPE_BG[item.type])}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary truncate block mt-0.5 leading-tight">
                    {item.name}
                  </span>
                </div>

                {/* 中央：スパークライン（5日間・1時間足） */}
                <div className="flex-none mx-2" style={{ width: 52, height: 20 }}>
                  {sparkPath ? (
                    <svg width="52" height="20" viewBox="0 0 52 20" fill="none">
                      <path
                        d={sparkPath}
                        stroke={isPositive ? "#22c55e" : "#ef4444"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="52" height="20" viewBox="0 0 52 20" fill="none">
                      <line x1="4" y1="10" x2="48" y2="10" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
                    </svg>
                  )}
                </div>

                {/* 右：価格 + 変動率 */}
                <div className="flex flex-col items-end flex-none">
                  {quote ? (
                    <>
                      <span className="text-xs font-mono font-semibold text-text-primary">
                        {currencySymbol(dispCurrency)}{formatPrice(dispPrice, item.symbol, dispCurrency)}
                      </span>
                      <span className={clsx("flex items-center gap-0.5 text-[10px] font-mono", isPositive ? "text-accent-green" : "text-accent-red")}>
                        {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] text-text-muted animate-pulse">取得中...</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
