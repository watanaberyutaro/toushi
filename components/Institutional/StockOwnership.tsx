"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface Holder {
  name: string;
  shares: number;
  value: number;
  reportDate: string;
  change: number;
}

interface Props {
  symbol: string | null;
}

export default function StockOwnership({ symbol }: Props) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSymbol, setLastSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol || symbol === lastSymbol) return;
    setLastSymbol(symbol);
    setLoading(true);
    setError(null);

    fetch(`/api/institutional/ownership?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHolders(data);
          if (data.length === 0) setError("データなし");
        } else {
          setError("データ取得に失敗しました");
        }
      })
      .catch(() => setError("通信エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [symbol, lastSymbol]);

  const maxValue = Math.max(...holders.map((h) => h.value), 1);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Symbol header */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/50 sticky top-0 bg-bg-secondary z-10">
        <span className="text-xs text-text-muted">
          {symbol ? (
            <><span className="text-text-primary font-mono font-semibold">{symbol}</span> の主要機関保有者</>
          ) : "銘柄を選択してください"}
        </span>
        {loading && <RefreshCw size={12} className="animate-spin text-text-muted" />}
      </div>

      {/* Content */}
      {!symbol ? (
        <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
          <AlertCircle size={24} className="opacity-30" />
          <span className="text-xs">ウォッチリストから銘柄を選択してください</span>
        </div>
      ) : error && holders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2 px-4">
          <AlertCircle size={24} className="opacity-30" />
          <span className="text-xs text-center">{error}</span>
          <span className="text-xs text-center opacity-60">Finnhub プレミアムプランが必要な場合があります</span>
        </div>
      ) : (
        <div className="px-3 py-2 space-y-2">
          {holders.map((h, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-lg p-3">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-xs font-semibold text-text-primary leading-tight max-w-[65%]">{h.name}</span>
                <div className={clsx(
                  "flex items-center gap-0.5 text-xs font-mono",
                  h.change >= 0 ? "text-accent-green" : "text-accent-red"
                )}>
                  {h.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  <span>{h.change >= 0 ? "+" : ""}{h.change.toLocaleString()}</span>
                </div>
              </div>

              {/* Value bar */}
              <div className="w-full h-1 bg-bg-tertiary rounded-full mb-1.5">
                <div
                  className="h-full bg-accent-purple/60 rounded-full"
                  style={{ width: `${(h.value / maxValue) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>{h.shares.toLocaleString()} 株</span>
                <span>${(h.value / 1e6).toFixed(1)}M</span>
                <span>{h.reportDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
