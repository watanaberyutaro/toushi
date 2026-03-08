export interface Symbol {
  id: string;
  symbol: string;
  name: string;
  exchange?: string;
  type: "stock" | "forex" | "crypto" | "etf";
  price?: number;
  change?: number;
  changePercent?: number;
}

export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalIndicator {
  name: string;
  enabled: boolean;
  data?: Record<string, number>[];
}

export type Timeframe = "15min" | "1h" | "4h" | "1day" | "1week" | "1month" | "1year" | "5year";

export interface ChartContext {
  symbol: string;
  timeframe: Timeframe;
  currentPrice: number;
  change: number;
  changePercent: number;
  indicators: {
    sma20?: number;
    sma50?: number;
    sma200?: number;
    rsi?: number;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bb?: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  recentCandles: OHLCVData[];
}

export interface NewsSource {
  headline: string;
  url: string;
  source: string;
  datetime: number; // UNIX timestamp
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  chartActions?: ChartAction[];
  sources?: NewsSource[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface ChartAction {
  type: "horizontal_line" | "trend_line" | "marker" | "clear";
  params: {
    price?: number;
    price1?: number;
    price2?: number;
    time1?: number;
    time2?: number;
    color?: string;
    label?: string;
    text?: string;
    time?: number;
    position?: "aboveBar" | "belowBar" | "inBar";
    shape?: "circle" | "square" | "arrowUp" | "arrowDown";
  };
}

export interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  price: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  type: "stock" | "forex" | "crypto" | "etf";
  createdAt: string;
}

export interface AnalysisLog {
  id: string;
  symbol: string;
  analysisType: string;
  aiSummary: string;
  confidence: "high" | "medium" | "low";
  priceAtAnalysis: number;
  createdAt: string;
}
