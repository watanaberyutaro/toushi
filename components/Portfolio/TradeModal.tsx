"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { usePortfolioSync } from "@/hooks/usePortfolioSync";
import {
  convertPrice,
  formatPrice,
  currencySymbol,
  needsConversion,
} from "@/lib/currency";

interface Props {
  action: "buy" | "sell";
  onClose: () => void;
}

export default function TradeModal({ action, onClose }: Props) {
  const { selectedSymbol, currentPrice, currency, usdJpyRate } = useAppStore();
  const { buy, sell, cashJPY, positions } = usePortfolioStore();
  const { sync } = usePortfolioSync();

  const sym = selectedSymbol?.symbol ?? "";
  const type = selectedSymbol?.type ?? "stock";
  const canConvert = needsConversion(sym, type);
  const displayCurrency = canConvert ? currency : "USD";
  const displayPrice = convertPrice(currentPrice, currency, usdJpyRate, sym, type);

  // Determine step/precision based on type
  const isCrypto = type === "crypto";
  const isForex = type === "forex";
  const step = isForex ? 100 : isCrypto ? 0.0001 : 1;
  const minQty = isForex ? 100 : isCrypto ? 0.0001 : 1;

  const heldPosition = positions[sym];
  const heldQty = heldPosition?.quantity ?? 0;

  const [quantity, setQuantity] = useState<string>(
    isForex ? "100" : isCrypto ? "0.0001" : "1"
  );
  const [error, setError] = useState<string | null>(null);

  const qty = parseFloat(quantity) || 0;

  // Cost / proceeds always in JPY
  const totalJPY = currentPrice * qty * usdJpyRate;

  // Position after trade
  const qtyAfter =
    action === "buy" ? heldQty + qty : heldQty - qty;

  const handleSubmit = () => {
    setError(null);
    if (!selectedSymbol) return;
    let errMsg: string | null = null;
    if (action === "buy") {
      errMsg = buy(
        sym,
        selectedSymbol.name,
        type,
        qty,
        currentPrice,
        usdJpyRate
      );
    } else {
      errMsg = sell(sym, qty, currentPrice, usdJpyRate);
    }
    if (errMsg) {
      setError(errMsg);
    } else {
      sync(); // Supabase に保存
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isBuy = action === "buy";
  const accentColor = isBuy ? "accent-green" : "accent-red";
  const actionLabel = isBuy ? "買い注文" : "売り注文";
  const actionBtnLabel = isBuy ? "買い執行" : "売り執行";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-secondary border border-border rounded-lg w-[360px] shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-border rounded-t-lg bg-${accentColor}/10`}>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                isBuy ? "bg-accent-green" : "bg-accent-red"
              }`}
            >
              {isBuy ? "BUY" : "SELL"}
            </span>
            <span className="text-sm font-mono font-bold text-text-primary">
              {actionLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Symbol */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">シンボル</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-text-primary">
                {sym}
              </span>
              <span className="text-xs text-text-muted">
                {selectedSymbol?.name}
              </span>
            </div>
          </div>

          {/* Current price */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">現在値</span>
            <span className="text-sm font-mono font-semibold text-text-primary">
              {currencySymbol(displayCurrency)}
              {formatPrice(displayPrice, sym, displayCurrency)}
            </span>
          </div>

          {/* Held quantity */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">保有数量</span>
            <span className="text-sm font-mono text-text-secondary">
              {heldQty > 0 ? heldQty.toLocaleString() : "—"}
            </span>
          </div>

          {/* Quantity input */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted">
              数量{action === "sell" && heldQty > 0 && ` (最大: ${heldQty})`}
            </label>
            <input
              type="number"
              min={minQty}
              step={step}
              max={action === "sell" ? heldQty : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-text-primary font-mono text-sm focus:outline-none focus:border-accent-blue"
              placeholder="数量を入力"
            />
            {/* Quick fill for sell */}
            {action === "sell" && heldQty > 0 && (
              <div className="flex gap-1 mt-1">
                {[0.25, 0.5, 0.75, 1].map((frac) => (
                  <button
                    key={frac}
                    onClick={() => {
                      const q = heldQty * frac;
                      setQuantity(
                        isCrypto
                          ? q.toFixed(8)
                          : isForex
                          ? Math.floor(q / 100) * 100 + ""
                          : Math.floor(q) + ""
                      );
                    }}
                    className="flex-1 px-1 py-0.5 text-xs rounded bg-bg-tertiary border border-border text-text-muted hover:text-text-primary hover:border-border transition-colors"
                  >
                    {frac === 1 ? "全売" : `${frac * 100}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estimated total */}
          <div className="bg-bg-tertiary rounded p-3 space-y-2 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {isBuy ? "必要金額 (概算)" : "受取金額 (概算)"}
              </span>
              <span className="text-sm font-mono font-bold text-text-primary">
                ¥{totalJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">利用可能残高</span>
              <span
                className={`text-xs font-mono ${
                  isBuy && totalJPY > cashJPY
                    ? "text-accent-red"
                    : "text-text-secondary"
                }`}
              >
                ¥{cashJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
              </span>
            </div>
            {isBuy && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">取引後残高</span>
                <span
                  className={`text-xs font-mono ${
                    cashJPY - totalJPY < 0 ? "text-accent-red" : "text-text-secondary"
                  }`}
                >
                  ¥
                  {(cashJPY - totalJPY).toLocaleString("ja-JP", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">取引後保有数量</span>
              <span
                className={`text-xs font-mono ${
                  qtyAfter < 0 ? "text-accent-red" : "text-text-secondary"
                }`}
              >
                {qtyAfter >= 0 ? qtyAfter.toLocaleString() : `超過 (${qtyAfter.toLocaleString()})`}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded font-semibold text-sm transition-colors bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border hover:border-text-muted"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={qty <= 0}
              className={`flex-1 px-4 py-2 rounded font-semibold text-sm transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                isBuy
                  ? "bg-accent-green hover:bg-accent-green/80"
                  : "bg-accent-red hover:bg-accent-red/80"
              }`}
            >
              {actionBtnLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
