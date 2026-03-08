"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  UTCTimestamp,
} from "lightweight-charts";
import { useAppStore } from "@/stores/useAppStore";
import ChartControls from "./ChartControls";
import { ChartAction, OHLCVData } from "@/types";
import { RefreshCw, AlertCircle } from "lucide-react";
import { needsConversion } from "@/lib/currency";

// Timeframe to API interval mapping
const TIMEFRAME_INTERVAL: Record<string, string> = {
  "15min":  "15min",
  "1h":     "1h",
  "4h":     "4h",
  "1day":   "1day",
  "1week":  "1week",
  "1month": "1month",
  "1year":  "1year",
  "5year":  "5year",
};

// Timeframe ごとの取得本数（range 内の全データを確保できる値）
const TIMEFRAME_OUTPUTSIZE: Record<string, number> = {
  "15min":  400,  // 1d の 1m 足 ~390本
  "1h":     400,  // 同上
  "4h":     200,  // 1d の 5m 足 ~78本
  "1day":   400,  // 5d の 5m 足 ~390本
  "1week":  600,  // 5d の 15m 足 ~130本
  "1month": 200,  // 1mo の 1h 足 ~143本（株式）
  "1year":  260,  // 1y の日足 ~252本
  "5year":  300,  // 5y の週足 ~260本
};

// 短期 timeframe で表示する最新バー数（これだけ表示して残りは非表示）
const TIMEFRAME_VISIBLE_BARS: Partial<Record<string, number>> = {
  "15min": 15,  // 最新15本 = 15分
  "1h":    60,  // 最新60本 = 1時間
  "4h":    48,  // 最新48本(×5m) = 4時間
  "1day":  78,  // 最新78本(×5m) ≈ 1取引日(6.5h)
};

type CandlestickData = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

type LineData = {
  time: UTCTimestamp;
  value: number;
};

export default function ChartContainer() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  // リアルタイム更新用: 最新ローソク足をUSD建てで保持（ohlcvDataを汚染しない）
  const lastCandleUSDRef = useRef<OHLCVData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sma200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLineRefs = useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[]>([]);

  const {
    selectedSymbol,
    timeframe,
    indicators,
    chartActions,
    ohlcvData,
    setOhlcvData,
    setCurrentPrice,
    setChartContext,
    clearChartActions,
    currency,
    usdJpyRate,
  } = useAppStore();

  // OHLCVデータに通貨変換を適用する（ohlcvDataは常にUSD建て原価）
  const applyRate = (data: OHLCVData[]): OHLCVData[] => {
    const sym = selectedSymbol?.symbol ?? "";
    const type = selectedSymbol?.type ?? "stock";
    if (currency !== "JPY" || !needsConversion(sym, type) || usdJpyRate <= 0) {
      return data;
    }
    return data.map((d) => ({
      ...d,
      open:  parseFloat((d.open  * usdJpyRate).toFixed(2)),
      high:  parseFloat((d.high  * usdJpyRate).toFixed(2)),
      low:   parseFloat((d.low   * usdJpyRate).toFixed(2)),
      close: parseFloat((d.close * usdJpyRate).toFixed(2)),
    }));
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#131720" },
        textColor: "#787B86",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "#1E2A3B", style: 1 },
        horzLines: { color: "#1E2A3B", style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#374151", labelBackgroundColor: "#1E2A3B" },
        horzLine: { color: "#374151", labelBackgroundColor: "#1E2A3B" },
      },
      rightPriceScale: {
        borderColor: "#2A3040",
        textColor: "#787B86",
      },
      timeScale: {
        borderColor: "#2A3040",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#089981",
      downColor: "#F23645",
      borderUpColor: "#089981",
      borderDownColor: "#F23645",
      wickUpColor: "#089981",
      wickDownColor: "#F23645",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Resize observer
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  // Convert OHLCVData to CandlestickData with proper types
  const toChartData = (data: OHLCVData[]): CandlestickData[] =>
    data.map((d) => ({
      time: d.time as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

  const toLineData = (data: { time: number; value: number }[]): LineData[] =>
    data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }));

  // Load data when symbol or timeframe changes
  const loadData = useCallback(async () => {
    if (!selectedSymbol || !candleSeriesRef.current) return;

    setIsLoading(true);
    setError(null);

    const interval = TIMEFRAME_INTERVAL[timeframe];
    const outputsize = TIMEFRAME_OUTPUTSIZE[timeframe] ?? 200;

    try {
      const res = await fetch(
        `/api/market-data/time-series?symbol=${encodeURIComponent(selectedSymbol.symbol)}&interval=${interval}&outputsize=${outputsize}`
      );

      if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("データが取得できませんでした。銘柄コードを確認してください。");
      }

      // 念のため昇順ソートを保証（APIルート側でもソート済み）
      const sorted = [...data].sort((a, b) => a.time - b.time);
      setOhlcvData(sorted); // 常にUSD建て原価で保存

      const converted = applyRate(sorted);
      candleSeriesRef.current.setData(toChartData(converted));
      const lastCandle = sorted[sorted.length - 1]; // currentPriceはUSD建てで保持
      setCurrentPrice(lastCandle.close);

      setChartContext({
        symbol: selectedSymbol.symbol,
        timeframe,
        currentPrice: lastCandle.close,
        change: lastCandle.close - lastCandle.open,
        changePercent: ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100,
        indicators: {},
        recentCandles: sorted.slice(-20),
      });

      const visibleBars = TIMEFRAME_VISIBLE_BARS[timeframe];
      if (visibleBars !== undefined && converted.length > visibleBars) {
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: converted.length - visibleBars - 0.5,
          to: converted.length - 0.5,
        });
      } else {
        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "データ取得に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, timeframe, setOhlcvData, setCurrentPrice, setChartContext]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 通貨切り替え時：再フェッチせずに保存済みデータを再描画 + 縦軸をリセット
  useEffect(() => {
    if (!candleSeriesRef.current || ohlcvData.length === 0) return;
    const converted = applyRate(ohlcvData);
    candleSeriesRef.current.setData(toChartData(converted));
    // 価格レンジが大幅に変わるため、縦軸を自動スケールに戻してからフィット
    chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
    chartRef.current?.timeScale().fitContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, usdJpyRate]);

  // ohlcvData が変化したら lastCandleUSDRef を最新化
  useEffect(() => {
    if (ohlcvData.length > 0) {
      lastCandleUSDRef.current = { ...ohlcvData[ohlcvData.length - 1] };
    } else {
      lastCandleUSDRef.current = null;
    }
  }, [ohlcvData]);

  // 3秒ごとのリアルタイム更新
  useEffect(() => {
    if (!selectedSymbol) {
      setIsLive(false);
      return;
    }
    setIsLive(false);

    const poll = async () => {
      if (!candleSeriesRef.current || !lastCandleUSDRef.current) return;
      try {
        const res = await fetch(
          `/api/market-data/realtime?symbol=${encodeURIComponent(selectedSymbol.symbol)}`
        );
        if (!res.ok) return;
        const rtData = await res.json() as { price?: number; error?: string };
        if (!rtData?.price || rtData.error) return;

        const priceUSD = rtData.price;
        const last = lastCandleUSDRef.current;

        // USD建てで最新ローソク足を更新（highとlowも追跡）
        const updatedUSD: OHLCVData = {
          ...last,
          close: priceUSD,
          high: Math.max(last.high, priceUSD),
          low: Math.min(last.low, priceUSD),
        };
        lastCandleUSDRef.current = updatedUSD;

        // 表示用に通貨変換
        const sym = selectedSymbol.symbol;
        const type = selectedSymbol.type;
        let dOpen = updatedUSD.open;
        let dHigh = updatedUSD.high;
        let dLow  = updatedUSD.low;
        let dClose = priceUSD;
        if (currency === "JPY" && needsConversion(sym, type) && usdJpyRate > 0) {
          dOpen  = parseFloat((updatedUSD.open  * usdJpyRate).toFixed(2));
          dHigh  = parseFloat((updatedUSD.high  * usdJpyRate).toFixed(2));
          dLow   = parseFloat((updatedUSD.low   * usdJpyRate).toFixed(2));
          dClose = parseFloat((priceUSD         * usdJpyRate).toFixed(2));
        }

        candleSeriesRef.current.update({
          time: last.time as UTCTimestamp,
          open: dOpen,
          high: dHigh,
          low: dLow,
          close: dClose,
        });

        setCurrentPrice(priceUSD); // currentPrice は常にUSD
        setIsLive(true);
      } catch {
        // ポーリングエラーは無視
      }
    };

    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, currency, usdJpyRate, setCurrentPrice]);

  // Handle indicator toggles（通貨変換後のデータで計算）
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || ohlcvData.length === 0) return;

    const chart = chartRef.current;
    // インジケーターも表示通貨に合わせて変換したデータを使う
    const displayData = applyRate(ohlcvData);

    // SMA 20
    if (indicators.sma20) {
      if (!sma20SeriesRef.current) {
        sma20SeriesRef.current = chart.addLineSeries({
          color: "#2962FF",
          lineWidth: 1,
          title: "SMA20",
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      sma20SeriesRef.current.setData(toLineData(calculateSMA(displayData, 20)));
    } else if (sma20SeriesRef.current) {
      chart.removeSeries(sma20SeriesRef.current);
      sma20SeriesRef.current = null;
    }

    // SMA 50
    if (indicators.sma50) {
      if (!sma50SeriesRef.current) {
        sma50SeriesRef.current = chart.addLineSeries({
          color: "#FF9800",
          lineWidth: 1,
          title: "SMA50",
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      sma50SeriesRef.current.setData(toLineData(calculateSMA(displayData, 50)));
    } else if (sma50SeriesRef.current) {
      chart.removeSeries(sma50SeriesRef.current);
      sma50SeriesRef.current = null;
    }

    // SMA 200
    if (indicators.sma200) {
      if (!sma200SeriesRef.current) {
        sma200SeriesRef.current = chart.addLineSeries({
          color: "#E91E63",
          lineWidth: 1,
          title: "SMA200",
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      sma200SeriesRef.current.setData(toLineData(calculateSMA(displayData, 200)));
    } else if (sma200SeriesRef.current) {
      chart.removeSeries(sma200SeriesRef.current);
      sma200SeriesRef.current = null;
    }

    // Bollinger Bands
    if (indicators.bb) {
      const bbData = calculateBollingerBands(displayData, 20, 2);
      if (!bbUpperRef.current) {
        bbUpperRef.current = chart.addLineSeries({
          color: "#AA00FF",
          lineWidth: 1,
          lineStyle: 2,
          title: "BB Upper",
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      if (!bbMiddleRef.current) {
        bbMiddleRef.current = chart.addLineSeries({
          color: "#AA00FF",
          lineWidth: 1,
          title: "BB Middle",
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      if (!bbLowerRef.current) {
        bbLowerRef.current = chart.addLineSeries({
          color: "#AA00FF",
          lineWidth: 1,
          lineStyle: 2,
          title: "BB Lower",
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      bbUpperRef.current.setData(toLineData(bbData.upper));
      bbMiddleRef.current.setData(toLineData(bbData.middle));
      bbLowerRef.current.setData(toLineData(bbData.lower));
    } else {
      if (bbUpperRef.current) { chart.removeSeries(bbUpperRef.current); bbUpperRef.current = null; }
      if (bbMiddleRef.current) { chart.removeSeries(bbMiddleRef.current); bbMiddleRef.current = null; }
      if (bbLowerRef.current) { chart.removeSeries(bbLowerRef.current); bbLowerRef.current = null; }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators, ohlcvData, currency, usdJpyRate]);

  // Handle AI chart actions
  useEffect(() => {
    if (chartActions.length === 0 || !candleSeriesRef.current) return;

    for (const action of chartActions) {
      applyChartAction(action);
    }
    clearChartActions();
  }, [chartActions, clearChartActions]);

  const applyChartAction = (action: ChartAction) => {
    if (!candleSeriesRef.current) return;

    switch (action.type) {
      case "horizontal_line":
        if (action.params.price !== undefined) {
          const priceLine = candleSeriesRef.current.createPriceLine({
            price: action.params.price,
            color: action.params.color || "#F7931A",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: action.params.label || "",
          });
          priceLineRefs.current.push(priceLine);
        }
        break;
      case "marker":
        if (action.params.time !== undefined) {
          candleSeriesRef.current.setMarkers([
            {
              time: action.params.time as UTCTimestamp,
              position: action.params.position || "aboveBar",
              color: action.params.color || "#2962FF",
              shape: action.params.shape || "circle",
              text: action.params.text || "",
            },
          ]);
        }
        break;
      case "clear":
        priceLineRefs.current.forEach((pl) => {
          try { candleSeriesRef.current?.removePriceLine(pl); } catch {}
        });
        priceLineRefs.current = [];
        candleSeriesRef.current.setMarkers([]);
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      <ChartControls onRefresh={loadData} isLive={isLive} />
      <div className="relative flex-1">
        <div ref={chartContainerRef} className="absolute inset-0" />

        {/* ローディングオーバーレイ */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary/80 z-10">
            <RefreshCw size={24} className="text-accent-blue animate-spin mb-3" />
            <p className="text-sm text-text-secondary">
              {selectedSymbol?.symbol} のデータを取得中...
            </p>
          </div>
        )}

        {/* エラー表示 */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary z-10">
            <AlertCircle size={32} className="text-accent-red mb-3" />
            <p className="text-sm text-text-primary mb-1">データ取得エラー</p>
            <p className="text-xs text-text-muted mb-4 max-w-xs text-center">{error}</p>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={13} />
              再試行
            </button>
          </div>
        )}

        {/* 銘柄未選択 */}
        {!selectedSymbol && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary z-10">
            <p className="text-sm text-text-muted">左のウォッチリストから銘柄を選択してください</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Technical calculation helpers
function calculateSMA(data: OHLCVData[], period: number) {
  const result: { time: number; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
    result.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(4)) });
  }
  return result;
}

function calculateBollingerBands(data: OHLCVData[], period: number, stdDev: number) {
  const upper: { time: number; value: number }[] = [];
  const middle: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b.close, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b.close - avg, 2), 0) / period;
    const std = Math.sqrt(variance);

    middle.push({ time: data[i].time, value: parseFloat(avg.toFixed(4)) });
    upper.push({ time: data[i].time, value: parseFloat((avg + stdDev * std).toFixed(4)) });
    lower.push({ time: data[i].time, value: parseFloat((avg - stdDev * std).toFixed(4)) });
  }

  return { upper, middle, lower };
}
