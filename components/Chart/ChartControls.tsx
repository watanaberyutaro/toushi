"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { Timeframe } from "@/types";
import { convertPrice, formatPrice, currencySymbol, needsConversion } from "@/lib/currency";
import TradeModal from "@/components/Portfolio/TradeModal";
import { usePortfolioStore } from "@/stores/usePortfolioStore";

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "15m", value: "15min" },
  { label: "1H",  value: "1h" },
  { label: "4H",  value: "4h" },
  { label: "1D",  value: "1day" },
  { label: "1W",  value: "1week" },
  { label: "1M",  value: "1month" },
  { label: "1Y",  value: "1year" },
  { label: "5Y",  value: "5year" },
];

const INDICATORS = [
  { key: "sma20" as const, label: "SMA20", color: "text-blue-400" },
  { key: "sma50" as const, label: "SMA50", color: "text-orange-400" },
  { key: "sma200" as const, label: "SMA200", color: "text-pink-400" },
  { key: "bb" as const, label: "BB", color: "text-purple-400" },
  { key: "rsi" as const, label: "RSI", color: "text-yellow-400" },
  { key: "macd" as const, label: "MACD", color: "text-cyan-400" },
] as const;

interface Props {
  onRefresh: () => void;
  isLive?: boolean;
}

export default function ChartControls({ onRefresh, isLive = false }: Props) {
  const {
    selectedSymbol,
    timeframe,
    setTimeframe,
    indicators,
    toggleIndicator,
    currentPrice,
    chartContext,
    currency,
    setCurrency,
    usdJpyRate,
  } = useAppStore();

  const { positions } = usePortfolioStore();
  const [tradeAction, setTradeAction] = useState<"buy" | "sell" | null>(null);
  const [showIndicators, setShowIndicators] = useState(false);

  const change = chartContext?.change ?? 0;
  const changePercent = chartContext?.changePercent ?? 0;
  const isPositive = changePercent >= 0;

  const sym = selectedSymbol?.symbol ?? "";
  const type = selectedSymbol?.type ?? "stock";
  const displayPrice = convertPrice(currentPrice, currency, usdJpyRate, sym, type);
  const displayChange = convertPrice(Math.abs(change), currency, usdJpyRate, sym, type);
  const canConvert = needsConversion(sym, type);
  const dispCurrency = canConvert ? currency : "USD";

  const heldPosition = sym ? positions[sym] : null;
  const heldQty = heldPosition?.quantity ?? 0;

  const activeIndicatorCount = INDICATORS.filter(({ key }) => indicators[key]).length;

  return (
    <>
      {/* ── Desktop layout ────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary">
        {/* Symbol Info */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-text-primary">
                {selectedSymbol?.symbol || "---"}
              </span>
              <span className="text-xs text-text-muted">{selectedSymbol?.name || ""}</span>
              {isLive && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-green/10 border border-accent-green/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-accent-green">LIVE</span>
                </span>
              )}
            </div>
            {currentPrice > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-primary">
                  {currencySymbol(dispCurrency)}{formatPrice(displayPrice, sym, dispCurrency)}
                </span>
                <span className={clsx("text-xs font-mono", isPositive ? "text-accent-green" : "text-accent-red")}>
                  {isPositive ? "+" : "-"}{currencySymbol(dispCurrency)}{formatPrice(displayChange, sym, dispCurrency)}
                  {" "}({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
                </span>
                {heldQty > 0 && (
                  <span className="text-[10px] font-mono text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded border border-accent-blue/20">
                    保有: {heldQty.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentPrice > 0 && selectedSymbol && (
            <>
              <button onClick={() => setTradeAction("buy")}
                className="px-3 py-1 text-xs font-bold rounded bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-white border border-accent-green/40 transition-colors">
                買い
              </button>
              <button onClick={() => setTradeAction("sell")}
                className="px-3 py-1 text-xs font-bold rounded bg-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white border border-accent-red/40 transition-colors">
                売り
              </button>
              <div className="w-px h-4 bg-border" />
            </>
          )}

          <div className="flex items-center bg-bg-tertiary rounded overflow-hidden border border-border">
            <button onClick={() => setCurrency("USD")}
              className={clsx("px-2.5 py-1 text-xs font-mono font-semibold transition-colors",
                currency === "USD" ? "bg-accent-blue text-white" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover")}>
              $ USD
            </button>
            <button onClick={() => setCurrency("JPY")}
              className={clsx("px-2.5 py-1 text-xs font-mono font-semibold transition-colors",
                currency === "JPY" ? "bg-accent-yellow text-bg-primary" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover")}>
              ¥ JPY
            </button>
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center bg-bg-tertiary rounded overflow-hidden border border-border">
            {TIMEFRAMES.map((tf) => (
              <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                className={clsx("px-2 py-1 text-xs font-mono transition-colors",
                  timeframe === tf.value ? "bg-accent-blue text-white" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover")}>
                {tf.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-1">
            {INDICATORS.map(({ key, label, color }) => (
              <button key={key} onClick={() => toggleIndicator(key)}
                className={clsx("px-2 py-0.5 text-xs rounded transition-all border",
                  indicators[key] ? `bg-bg-hover border-border ${color} font-semibold` : "text-text-muted border-transparent hover:border-border hover:text-text-secondary")}>
                {label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border" />

          <button onClick={onRefresh}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title="データ更新">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Mobile layout ─────────────────────────────── */}
      <div className="flex md:hidden flex-col border-b border-border bg-bg-secondary">
        {/* Row 1: Symbol + price + buy/sell */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-text-primary">
                {selectedSymbol?.symbol || "---"}
              </span>
              {isLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              )}
            </div>
            {currentPrice > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono text-text-primary">
                  {currencySymbol(dispCurrency)}{formatPrice(displayPrice, sym, dispCurrency)}
                </span>
                <span className={clsx("text-xs font-mono", isPositive ? "text-accent-green" : "text-accent-red")}>
                  {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-none">
            {currentPrice > 0 && selectedSymbol && (
              <>
                <button onClick={() => setTradeAction("buy")}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-white border border-accent-green/40 transition-colors">
                  買い
                </button>
                <button onClick={() => setTradeAction("sell")}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white border border-accent-red/40 transition-colors">
                  売り
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Timeframe + currency + indicator toggle */}
        <div className="flex items-center gap-2 px-3 pb-2">
          {/* Timeframe scroll */}
          <div className="flex items-center bg-bg-tertiary rounded overflow-x-auto border border-border flex-1 min-w-0" style={{ scrollbarWidth: "none" }}>
            {TIMEFRAMES.map((tf) => (
              <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                className={clsx("px-2.5 py-1 text-xs font-mono whitespace-nowrap flex-none transition-colors",
                  timeframe === tf.value ? "bg-accent-blue text-white" : "text-text-secondary")}>
                {tf.label}
              </button>
            ))}
          </div>

          {/* Currency toggle */}
          <div className="flex items-center bg-bg-tertiary rounded overflow-hidden border border-border flex-none">
            <button onClick={() => setCurrency("USD")}
              className={clsx("px-2 py-1 text-xs font-mono font-semibold transition-colors",
                currency === "USD" ? "bg-accent-blue text-white" : "text-text-secondary")}>
              $
            </button>
            <button onClick={() => setCurrency("JPY")}
              className={clsx("px-2 py-1 text-xs font-mono font-semibold transition-colors",
                currency === "JPY" ? "bg-accent-yellow text-bg-primary" : "text-text-secondary")}>
              ¥
            </button>
          </div>

          {/* Indicator toggle button */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={clsx(
              "flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-colors flex-none",
              showIndicators || activeIndicatorCount > 0
                ? "border-accent-blue/50 bg-accent-blue/10 text-accent-blue"
                : "border-border text-text-muted"
            )}
          >
            <SlidersHorizontal size={12} />
            {activeIndicatorCount > 0 && <span>{activeIndicatorCount}</span>}
          </button>

          <button onClick={onRefresh}
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors flex-none"
            title="データ更新">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Indicator panel (expanded) */}
        {showIndicators && (
          <div className="flex items-center gap-1 px-3 pb-2 flex-wrap">
            {INDICATORS.map(({ key, label, color }) => (
              <button key={key} onClick={() => toggleIndicator(key)}
                className={clsx("px-2 py-0.5 text-xs rounded transition-all border",
                  indicators[key] ? `bg-bg-hover border-border ${color} font-semibold` : "text-text-muted border-transparent border border-border/50")}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tradeAction !== null && (
        <TradeModal action={tradeAction} onClose={() => setTradeAction(null)} />
      )}
    </>
  );
}
