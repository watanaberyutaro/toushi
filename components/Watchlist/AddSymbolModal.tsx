"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { X, Search, Plus, Check, Loader2, TrendingUp, DollarSign, Bitcoin, BarChart2 } from "lucide-react";
import clsx from "clsx";

type AssetType = "all" | "stock" | "forex" | "crypto" | "etf";

interface SearchResult {
  symbol: string;
  name: string;
  jaName?: string;
  type: "stock" | "forex" | "crypto" | "etf";
  exchange: string;
  country?: string;
}

const TYPE_TABS: { label: string; value: AssetType; icon: React.ReactNode }[] = [
  { label: "すべて", value: "all", icon: <BarChart2 size={12} /> },
  { label: "株式", value: "stock", icon: <TrendingUp size={12} /> },
  { label: "FX", value: "forex", icon: <DollarSign size={12} /> },
  { label: "暗号資産", value: "crypto", icon: <Bitcoin size={12} /> },
  { label: "ETF", value: "etf", icon: <BarChart2 size={12} /> },
];

const TYPE_COLORS: Record<string, string> = {
  stock: "bg-accent-blue/20 text-accent-blue",
  forex: "bg-purple-500/20 text-purple-400",
  crypto: "bg-accent-yellow/20 text-accent-yellow",
  etf: "bg-accent-green/20 text-accent-green",
};

const TYPE_LABELS: Record<string, string> = {
  stock: "株式",
  forex: "FX",
  crypto: "暗号資産",
  etf: "ETF",
};

export default function AddSymbolModal() {
  const { watchlist, setWatchlist, toggleAddSymbol } = useAppStore();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<AssetType>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(
    new Set(watchlist.map((w) => w.symbol))
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 初期表示: おすすめ銘柄を取得
  const fetchResults = useCallback(async (q: string, type: AssetType) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q, type });
      const res = await fetch(`/api/market-data/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 初回マウント時にデフォルト一覧を表示
  useEffect(() => {
    fetchResults("", activeType);
    inputRef.current?.focus();
  }, []);

  // タブ切り替え時
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchResults(query, activeType);
  }, [activeType]);

  // 入力変化時 (300ms デバウンス)
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val, activeType);
    }, 300);
  };

  const addSymbol = async (result: SearchResult) => {
    if (addedSymbols.has(result.symbol)) return;
    setAddingSymbol(result.symbol);

    const displayName = result.jaName ?? result.name;
    const newItem = {
      id: Date.now().toString(),
      symbol: result.symbol,
      name: displayName,
      type: result.type,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: result.symbol,
          name: displayName,
          type: result.type,
        }),
      });
      const added = res.ok ? await res.json() : newItem;
      setWatchlist([...watchlist, added]);
    } catch {
      setWatchlist([...watchlist, newItem]);
    }

    setAddedSymbols((prev) => new Set([...prev, result.symbol]));
    setAddingSymbol(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) toggleAddSymbol(); }}
    >
      <div className="bg-bg-card border border-border rounded-xl w-[520px] shadow-2xl flex flex-col max-h-[80vh]">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-none">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">銘柄を検索・追加</h3>
            <p className="text-xs text-text-muted mt-0.5">
              株式・FX・暗号資産・ETFを検索できます
            </p>
          </div>
          <button
            onClick={toggleAddSymbol}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 検索欄 */}
        <div className="px-5 pt-4 pb-3 flex-none">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            {isSearching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-blue animate-spin"
              />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="例: 東京エレクトロン / AAPL / BTC..."
              value={query}
              onChange={handleQueryChange}
              className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
        </div>

        {/* タブフィルター */}
        <div className="px-5 pb-3 flex gap-1 flex-none">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveType(tab.value)}
              className={clsx(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                activeType === tab.value
                  ? "bg-accent-blue text-white shadow-sm"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 区切り線 */}
        <div className="border-t border-border flex-none" />

        {/* 結果リスト */}
        <div className="flex-1 overflow-y-auto chat-scroll">
          {results.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Search size={28} className="mb-3 opacity-30" />
              <p className="text-sm">
                {query ? `"${query}" に一致する銘柄が見つかりません` : "検索キーワードを入力してください"}
              </p>
            </div>
          ) : (
            <ul>
              {results.map((result, i) => {
                const inWatchlist = addedSymbols.has(result.symbol);
                const isAdding = addingSymbol === result.symbol;

                return (
                  <li
                    key={`${result.symbol}-${i}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-bg-hover transition-colors border-b border-border/40 last:border-0"
                  >
                    {/* 左側: 銘柄情報 */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* タイプアイコン */}
                      <div className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-none text-xs font-bold",
                        result.type === "crypto" ? "bg-accent-yellow/10 text-accent-yellow" :
                        result.type === "forex"  ? "bg-purple-500/10 text-purple-400" :
                        result.type === "etf"    ? "bg-accent-green/10 text-accent-green" :
                        "bg-accent-blue/10 text-accent-blue"
                      )}>
                        {result.type === "crypto" ? "₿" :
                         result.type === "forex"  ? "FX" :
                         result.type === "etf"    ? "E" : "S"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-text-primary">
                            {result.symbol}
                          </span>
                          <span className={clsx(
                            "text-xs px-1.5 py-0.5 rounded font-medium",
                            TYPE_COLORS[result.type]
                          )}>
                            {TYPE_LABELS[result.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-text-muted truncate max-w-[220px]">
                            {result.jaName ?? result.name}
                          </p>
                          {result.jaName && (
                            <p className="text-[10px] text-text-muted opacity-60 truncate max-w-[120px]">
                              {result.name}
                            </p>
                          )}
                          {result.exchange && (
                            <span className="text-xs text-text-muted font-mono opacity-60 flex-none">
                              {result.exchange}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右側: 追加ボタン */}
                    <button
                      onClick={() => addSymbol(result)}
                      disabled={inWatchlist || isAdding}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-none ml-3",
                        inWatchlist
                          ? "bg-accent-green/10 text-accent-green cursor-default"
                          : isAdding
                          ? "bg-bg-tertiary text-text-muted cursor-wait"
                          : "bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30"
                      )}
                    >
                      {inWatchlist ? (
                        <>
                          <Check size={11} />
                          追加済み
                        </>
                      ) : isAdding ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          追加中
                        </>
                      ) : (
                        <>
                          <Plus size={11} />
                          追加
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 py-3 border-t border-border flex-none">
          <p className="text-xs text-text-muted text-center">
            {results.length > 0 && `${results.length}件表示中`}
            {" · "}
            TwelveData API使用時はリアルタイム検索が有効になります
          </p>
        </div>
      </div>
    </div>
  );
}
