import { OHLCVData, WatchlistItem } from "@/types";

export function generateMockOHLCV(count: number = 200): OHLCVData[] {
  const data: OHLCVData[] = [];
  let price = 150 + Math.random() * 50;
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600; // 1 hour

  for (let i = count; i >= 0; i--) {
    const volatility = price * 0.02;
    const open = price;
    const change = (Math.random() - 0.48) * volatility;
    const close = Math.max(open + change, 1);
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 10000000 + 1000000);

    data.push({
      time: now - i * interval,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(Math.max(low, 0.01).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return data;
}

export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { id: "1", symbol: "AAPL", name: "アップル", type: "stock", createdAt: new Date().toISOString() },
  { id: "2", symbol: "TSLA", name: "テスラ", type: "stock", createdAt: new Date().toISOString() },
  { id: "3", symbol: "GOOGL", name: "アルファベット", type: "stock", createdAt: new Date().toISOString() },
  { id: "4", symbol: "USD/JPY", name: "米ドル / 円", type: "forex", createdAt: new Date().toISOString() },
  { id: "5", symbol: "EUR/USD", name: "ユーロ / 米ドル", type: "forex", createdAt: new Date().toISOString() },
  { id: "6", symbol: "BTC/USD", name: "ビットコイン", type: "crypto", createdAt: new Date().toISOString() },
];

export const MOCK_QUOTES: Record<string, { price: number; change: number; changePercent: number }> = {
  AAPL: { price: 223.45, change: 2.34, changePercent: 1.06 },
  TSLA: { price: 248.76, change: -5.43, changePercent: -2.13 },
  GOOGL: { price: 178.32, change: 0.87, changePercent: 0.49 },
  "USD/JPY": { price: 149.82, change: 0.34, changePercent: 0.23 },
  "EUR/USD": { price: 1.0892, change: -0.0023, changePercent: -0.21 },
  "BTC/USD": { price: 67842.50, change: 1234.50, changePercent: 1.85 },
};
