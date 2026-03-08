import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Position {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avgPriceUSD: number;
  lastPriceUSD: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  name: string;
  action: "buy" | "sell";
  quantity: number;
  priceUSD: number;
  usdJpyRate: number;
}

interface PortfolioStore {
  cashJPY: number;
  positions: Record<string, Position>;
  trades: Trade[];
  buy: (
    symbol: string,
    name: string,
    type: string,
    quantity: number,
    priceUSD: number,
    usdJpyRate: number
  ) => string | null;
  sell: (
    symbol: string,
    quantity: number,
    priceUSD: number,
    usdJpyRate: number
  ) => string | null;
  updatePrice: (symbol: string, priceUSD: number) => void;
  reset: () => void;
}

const INITIAL_CASH = 1_000_000;

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      cashJPY: INITIAL_CASH,
      positions: {},
      trades: [],

      buy: (symbol, name, type, quantity, priceUSD, usdJpyRate) => {
        if (quantity <= 0) return "数量を正しく入力してください";
        const { cashJPY, positions, trades } = get();
        const costJPY = priceUSD * quantity * usdJpyRate;
        if (costJPY > cashJPY)
          return `残高不足 (必要: ¥${costJPY.toLocaleString("ja-JP", { maximumFractionDigits: 0 })})`;
        const existing = positions[symbol];
        const newQty = (existing?.quantity ?? 0) + quantity;
        const newAvg = existing
          ? (existing.avgPriceUSD * existing.quantity + priceUSD * quantity) /
            newQty
          : priceUSD;
        const trade: Trade = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          symbol,
          name,
          action: "buy",
          quantity,
          priceUSD,
          usdJpyRate,
        };
        set({
          cashJPY: cashJPY - costJPY,
          positions: {
            ...positions,
            [symbol]: {
              symbol,
              name,
              type,
              quantity: newQty,
              avgPriceUSD: newAvg,
              lastPriceUSD: priceUSD,
            },
          },
          trades: [trade, ...trades].slice(0, 200),
        });
        return null;
      },

      sell: (symbol, quantity, priceUSD, usdJpyRate) => {
        if (quantity <= 0) return "数量を正しく入力してください";
        const { cashJPY, positions, trades } = get();
        const pos = positions[symbol];
        if (!pos) return "このシンボルは保有していません";
        if (quantity > pos.quantity)
          return `保有数量を超えています (保有: ${pos.quantity})`;
        const proceedsJPY = priceUSD * quantity * usdJpyRate;
        const newQty = pos.quantity - quantity;
        const newPositions = { ...positions };
        if (newQty === 0) {
          delete newPositions[symbol];
        } else {
          newPositions[symbol] = { ...pos, quantity: newQty, lastPriceUSD: priceUSD };
        }
        const trade: Trade = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          symbol,
          name: pos.name,
          action: "sell",
          quantity,
          priceUSD,
          usdJpyRate,
        };
        set({
          cashJPY: cashJPY + proceedsJPY,
          positions: newPositions,
          trades: [trade, ...trades].slice(0, 200),
        });
        return null;
      },

      updatePrice: (symbol, priceUSD) => {
        const { positions } = get();
        if (!positions[symbol]) return;
        set({
          positions: {
            ...positions,
            [symbol]: { ...positions[symbol], lastPriceUSD: priceUSD },
          },
        });
      },

      reset: () => set({ cashJPY: INITIAL_CASH, positions: {}, trades: [] }),
    }),
    { name: "trading-portfolio-v1" }
  )
);
