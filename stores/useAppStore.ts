import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Symbol, Timeframe, ChartContext, Alert, WatchlistItem, ChartAction, OHLCVData } from "@/types";
import { Currency } from "@/lib/currency";

interface AppState {
  // Selected symbol
  selectedSymbol: Symbol | null;
  setSelectedSymbol: (symbol: Symbol | null) => void;

  // Timeframe
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;

  // Chart context (sent to AI)
  chartContext: ChartContext | null;
  setChartContext: (ctx: ChartContext | null) => void;

  // OHLCV data（常にUSD建て原価で保持）
  ohlcvData: OHLCVData[];
  setOhlcvData: (data: OHLCVData[]) => void;

  // Current price（USD建て）
  currentPrice: number;
  setCurrentPrice: (price: number) => void;

  // Technical indicators toggle
  indicators: {
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    rsi: boolean;
    macd: boolean;
    bb: boolean;
  };
  toggleIndicator: (name: keyof AppState["indicators"]) => void;

  // Chart annotations from AI
  chartActions: ChartAction[];
  addChartAction: (action: ChartAction) => void;
  clearChartActions: () => void;

  // Watchlist
  watchlist: WatchlistItem[];
  setWatchlist: (items: WatchlistItem[]) => void;

  // Alerts
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;

  // 通貨設定
  currency: Currency;
  setCurrency: (c: Currency) => void;
  usdJpyRate: number;
  setUsdJpyRate: (rate: number) => void;

  // UI state
  showAlerts: boolean;
  toggleAlerts: () => void;
  showAddSymbol: boolean;
  toggleAddSymbol: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedSymbol: null,
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

      timeframe: "1day",
      setTimeframe: (tf) => set({ timeframe: tf }),

      chartContext: null,
      setChartContext: (ctx) => set({ chartContext: ctx }),

      ohlcvData: [],
      setOhlcvData: (data) => set({ ohlcvData: data }),

      currentPrice: 0,
      setCurrentPrice: (price) => set({ currentPrice: price }),

      indicators: {
        sma20: true,
        sma50: false,
        sma200: false,
        rsi: false,
        macd: false,
        bb: false,
      },
      toggleIndicator: (name) =>
        set((state) => ({
          indicators: {
            ...state.indicators,
            [name]: !state.indicators[name],
          },
        })),

      chartActions: [],
      addChartAction: (action) =>
        set((state) => ({ chartActions: [...state.chartActions, action] })),
      clearChartActions: () => set({ chartActions: [] }),

      watchlist: [],
      setWatchlist: (items) => set({ watchlist: items }),

      alerts: [],
      setAlerts: (alerts) => set({ alerts }),

      currency: "USD",
      setCurrency: (c) => set({ currency: c }),
      usdJpyRate: 150,
      setUsdJpyRate: (rate) => set({ usdJpyRate: rate }),

      showAlerts: false,
      toggleAlerts: () => set((state) => ({ showAlerts: !state.showAlerts })),

      showAddSymbol: false,
      toggleAddSymbol: () =>
        set((state) => ({ showAddSymbol: !state.showAddSymbol })),
    }),
    {
      name: "investment-watchlist",
      partialize: (state) => ({ watchlist: state.watchlist }),
    }
  )
);
