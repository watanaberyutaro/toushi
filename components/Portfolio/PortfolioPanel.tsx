"use client";

import { useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useAppStore } from "@/stores/useAppStore";
import {
  convertPrice,
  formatPrice,
  currencySymbol,
  needsConversion,
} from "@/lib/currency";

const INITIAL_CASH = 1_000_000;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export default function PortfolioPanel() {
  const { cashJPY, positions, trades, updatePrice, reset } = usePortfolioStore();
  const { currency, usdJpyRate } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const positionList = Object.values(positions);

  // Compute total portfolio value in JPY
  const investedJPY = positionList.reduce(
    (sum, pos) => sum + pos.lastPriceUSD * pos.quantity * usdJpyRate,
    0
  );
  const totalValueJPY = cashJPY + investedJPY;
  const totalPnlJPY = totalValueJPY - INITIAL_CASH;
  const totalPnlPct = (totalPnlJPY / INITIAL_CASH) * 100;
  const isPnlPositive = totalPnlJPY >= 0;

  const handleReset = () => {
    if (window.confirm("ポートフォリオをリセットしますか？\nすべてのポジション・取引履歴が削除され、初期残高 ¥1,000,000 に戻ります。")) {
      reset();
    }
  };

  const handleRefreshPrices = useCallback(async () => {
    if (positionList.length === 0) return;
    setRefreshing(true);
    try {
      const symbols = positionList.map((p) => p.symbol).join(",");
      const res = await fetch(
        `/api/market-data/quotes?symbols=${encodeURIComponent(symbols)}`
      );
      if (res.ok) {
        const data: Record<string, { price: number }> = await res.json();
        for (const [sym, quote] of Object.entries(data)) {
          if (quote?.price) {
            updatePrice(sym, quote.price);
          }
        }
      }
    } catch {
      // silently fail
    }
    setRefreshing(false);
  }, [positionList, updatePrice]);

  const hasAnyActivity = positionList.length > 0 || trades.length > 0;

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-y-auto">
      {/* Account Summary */}
      <div className="m-3 rounded-lg border border-border bg-bg-secondary p-4 space-y-3 flex-none">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            仮想口座サマリー
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-text-muted hover:text-accent-red hover:border-accent-red/50 transition-colors"
            title="ポートフォリオをリセット"
          >
            <RotateCcw size={11} />
            リセット
          </button>
        </div>

        {/* Total value */}
        <div>
          <div className="text-xs text-text-muted mb-0.5">総資産 (JPY)</div>
          <div className="text-2xl font-mono font-bold text-text-primary">
            ¥{totalValueJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-mono mt-0.5 ${
              isPnlPositive ? "text-accent-green" : "text-accent-red"
            }`}
          >
            {isPnlPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>
              {isPnlPositive ? "+" : ""}
              ¥{totalPnlJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
              {" "}
              ({isPnlPositive ? "+" : ""}
              {totalPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Detail row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-bg-tertiary rounded p-2">
            <div className="text-xs text-text-muted">現金残高</div>
            <div className="text-sm font-mono font-semibold text-text-primary">
              ¥{cashJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-bg-tertiary rounded p-2">
            <div className="text-xs text-text-muted">投資額</div>
            <div className="text-sm font-mono font-semibold text-text-primary">
              ¥{investedJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {!hasAnyActivity ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <div className="text-text-muted text-sm leading-relaxed">
            ポジションなし —<br />
            チャートの買い/売りボタンで取引を開始できます
          </div>
        </div>
      ) : (
        <>
          {/* Positions table */}
          {positionList.length > 0 && (
            <div className="mx-3 mb-3 flex-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  保有ポジション ({positionList.length})
                </span>
                <button
                  onClick={handleRefreshPrices}
                  disabled={refreshing}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-text-muted hover:text-text-primary hover:border-accent-blue/50 transition-colors"
                >
                  <RefreshCw
                    size={11}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  更新
                </button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-bg-secondary border-b border-border">
                      <th className="text-left px-3 py-2 text-text-muted font-medium">シンボル</th>
                      <th className="text-right px-2 py-2 text-text-muted font-medium">数量</th>
                      <th className="text-right px-2 py-2 text-text-muted font-medium">平均取得</th>
                      <th className="text-right px-2 py-2 text-text-muted font-medium">現在値</th>
                      <th className="text-right px-3 py-2 text-text-muted font-medium">損益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionList.map((pos) => {
                      const canConvert = needsConversion(pos.symbol, pos.type as "stock" | "forex" | "crypto" | "etf");
                      const dispCurrency = canConvert ? currency : "USD";
                      const dispAvg = convertPrice(pos.avgPriceUSD, currency, usdJpyRate, pos.symbol, pos.type as "stock" | "forex" | "crypto" | "etf");
                      const dispLast = convertPrice(pos.lastPriceUSD, currency, usdJpyRate, pos.symbol, pos.type as "stock" | "forex" | "crypto" | "etf");
                      const pnlUSD = (pos.lastPriceUSD - pos.avgPriceUSD) * pos.quantity;
                      const pnlJPY = pnlUSD * usdJpyRate;
                      const pnlPct = pos.avgPriceUSD !== 0
                        ? ((pos.lastPriceUSD - pos.avgPriceUSD) / pos.avgPriceUSD) * 100
                        : 0;
                      const isPosPositive = pnlJPY >= 0;

                      return (
                        <tr
                          key={pos.symbol}
                          className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors"
                        >
                          <td className="px-3 py-2">
                            <div className="font-mono font-semibold text-text-primary">
                              {pos.symbol}
                            </div>
                            <div className="text-text-muted text-[10px] truncate max-w-[80px]">
                              {pos.name}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-text-secondary">
                            {pos.quantity.toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-text-secondary">
                            {currencySymbol(dispCurrency)}
                            {formatPrice(dispAvg, pos.symbol, dispCurrency)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-text-primary">
                            {currencySymbol(dispCurrency)}
                            {formatPrice(dispLast, pos.symbol, dispCurrency)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div
                              className={`font-mono font-semibold ${
                                isPosPositive ? "text-accent-green" : "text-accent-red"
                              }`}
                            >
                              {isPosPositive ? "+" : ""}
                              ¥{pnlJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                            </div>
                            <div
                              className={`text-[10px] font-mono ${
                                isPosPositive ? "text-accent-green" : "text-accent-red"
                              }`}
                            >
                              {isPosPositive ? "+" : ""}
                              {pnlPct.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trade history */}
          {trades.length > 0 && (
            <div className="mx-3 mb-3 flex-none">
              <div className="mb-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  取引履歴 (直近 {Math.min(trades.length, 50)} 件)
                </span>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-y-auto max-h-[320px]">
                  {trades.slice(0, 50).map((trade) => {
                    const totalJPY = trade.priceUSD * trade.quantity * trade.usdJpyRate;
                    const isBuy = trade.action === "buy";
                    return (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between px-3 py-2 border-b border-border/50 hover:bg-bg-hover/50 transition-colors last:border-b-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-text-muted font-mono flex-none">
                            {formatTimestamp(trade.timestamp)}
                          </span>
                          <span
                            className={`flex-none px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                              isBuy ? "bg-accent-green" : "bg-accent-red"
                            }`}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </span>
                          <span className="text-xs font-mono font-semibold text-text-primary flex-none">
                            {trade.symbol}
                          </span>
                          <span className="text-xs text-text-muted font-mono truncate">
                            {trade.quantity.toLocaleString()} @ ${trade.priceUSD < 1 ? trade.priceUSD.toFixed(6) : trade.priceUSD.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-text-secondary flex-none ml-2">
                          ¥{totalJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
