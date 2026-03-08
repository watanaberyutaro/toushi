/**
 * lib/finnhub.ts — Yahoo Finance 非公式API経由でマーケットデータを取得
 * APIキー不要・グローバル株/FX/暗号資産対応
 * 既存ルートファイルとの互換性を保つため TwelveData 互換フォーマットで返却
 */

// Yahoo Finance はAPIキー不要のため常に true
export const isFinnhubConfigured = () => true;

// ─── インメモリキャッシュ ──────────────────────────────────────
interface CacheEntry { data: unknown; expiresAt: number; }
const cache = new Map<string, CacheEntry>();

function getCache(key: string): unknown | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.data;
}
function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Yahoo Finance fetch ──────────────────────────────────────
const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
};

async function yfetch(url: string): Promise<Response> {
  return fetch(url, { cache: "no-store", headers: YF_HEADERS });
}

// ─── シンボル変換 ─────────────────────────────────────────────
// 暗号資産のベース通貨一覧
const CRYPTO_BASES = new Set([
  "BTC","ETH","SOL","XRP","DOGE","ADA","AVAX","LINK","BNB","MATIC",
  "DOT","UNI","SHIB","LTC","BCH","ATOM","NEAR","ALGO","VET","FIL",
]);

/**
 * アプリ内シンボル → Yahoo Finance シンボルに変換
 * USD/JPY  → USDJPY=X
 * BTC/USD  → BTC-USD
 * AAPL     → AAPL（変換なし）
 */
function toYahooSymbol(symbol: string): string {
  if (!symbol.includes("/")) return symbol;
  const [base, quote] = symbol.split("/");
  if (CRYPTO_BASES.has(base.toUpperCase())) {
    return `${base.toUpperCase()}-${quote.toUpperCase()}`;
  }
  return `${base}${quote}=X`; // FX
}

// ─── インターバル → Yahoo Finance パラメータ ─────────────────
// アプリ内 timeframe → Yahoo Finance interval
// 15min/1h は 1m 足、4h/1day は 5m 足を使いクライアント側で表示範囲を絞る
const INTERVAL_MAP: Record<string, string> = {
  "15min":  "1m",  // 1分足で15分分を表示
  "1h":     "1m",  // 1分足で1時間分を表示
  "4h":     "5m",  // 5分足で4時間分を表示
  "1day":   "5m",  // 5分足で1日分を表示
  "1week":  "15m", // 15分足で1週間分を表示
  "1month": "1h",  // 1時間足で1ヶ月分を表示
  "1year":  "1d",  // 日足で1年分を表示
  "5year":  "1wk", // 週足で5年分を表示
};

// timeframe ごとの取得レンジ（十分なデータを確保）
const RANGE_MAP: Record<string, string> = {
  "15min":  "1d",  // 1日分の1分足（市場時間内 ~390本）
  "1h":     "1d",  // 同上
  "4h":     "1d",  // 1日分の5分足（~78本 → 最新48本を表示）
  "1day":   "5d",  // 5日分の5分足（~390本 → 最新78本を表示）
  "1week":  "5d",  // 5日分の1時間足（~33本）
  "1month": "1mo", // 1ヶ月分の日足（~22本）
  "1year":  "1y",  // 1年分の日足（~252本）
  "5year":  "5y",  // 5年分の週足（~260本）
};

// ─── ユーティリティ ───────────────────────────────────────────
function unixToDatetime(unix: number): string {
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function mapYahooType(quoteType: string): string {
  switch ((quoteType || "").toUpperCase()) {
    case "EQUITY":         return "Common Stock";
    case "ETF":            return "ETF";
    case "CURRENCY":       return "Physical Currency";
    case "CRYPTOCURRENCY": return "Digital Currency";
    case "FUTURE":         return "Futures";
    case "INDEX":          return "Index";
    default:               return "Common Stock";
  }
}

// ─── API関数 ──────────────────────────────────────────────────

/**
 * ローソク足データを取得（TwelveData 互換 { values: [...] } 形式）
 */
export async function getTimeSeries(
  symbol: string,
  interval: string,
  outputsize = 200
): Promise<
  | { values: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }[] }
  | { code: number; message: string }
> {
  const cacheKey = `ts:${symbol}:${interval}:${outputsize}`;
  const ttl = ["15min", "1h", "4h", "1day"].includes(interval) ? 60_000 : 5 * 60_000;
  const cached = getCache(cacheKey);
  if (cached) return cached as { values: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }[] };

  const yahooSymbol = toYahooSymbol(symbol);
  const yInterval   = INTERVAL_MAP[interval] || "1h";
  const range       = RANGE_MAP[interval]    || "2y";

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yInterval}&range=${range}&includePrePost=false`;
    const res  = await yfetch(url);
    const json = await res.json() as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ open?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; close?: (number|null)[]; volume?: (number|null)[] }> };
        }>;
        error?: { description?: string };
      };
    };

    const result = json?.chart?.result?.[0];
    if (!result?.timestamp || !result.indicators?.quote?.[0]) {
      const msg = json?.chart?.error?.description || "データを取得できませんでした";
      return { code: 502, message: msg };
    }

    const tsList = result.timestamp;
    const q      = result.indicators.quote[0];

    // null キャンドルを除去して最新 outputsize 本を取得
    const candles = tsList
      .map((ts, i) => ({
        datetime: unixToDatetime(ts),
        open:  q.open?.[i]   ?? null,
        high:  q.high?.[i]   ?? null,
        low:   q.low?.[i]    ?? null,
        close: q.close?.[i]  ?? null,
        volume:q.volume?.[i] ?? null,
      }))
      .filter(c => c.close != null && c.close > 0 && c.open != null)
      .slice(-outputsize);

    if (candles.length === 0) return { values: [] };

    const values = candles.map(c => ({
      datetime: c.datetime,
      open:     String(c.open),
      high:     String(c.high),
      low:      String(c.low),
      close:    String(c.close),
      volume:   c.volume != null ? String(c.volume) : undefined,
    }));

    const out = { values };
    setCache(cacheKey, out, ttl);
    return out;
  } catch (err) {
    return { code: 500, message: String(err) };
  }
}

/** v8/finance/chart の meta から price/change/prevClose を取得する共通ヘルパー */
async function fetchChartMeta(yahooSymbol: string): Promise<{
  price: number; change: number; percentChange: number;
} | null> {
  try {
    const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
    const res  = await yfetch(url);
    const json = await res.json() as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } }>; error?: unknown };
    };
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price    = meta.regularMarketPrice;
    const prevClose= meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change   = price - prevClose;
    const pct      = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return { price, change, percentChange: pct };
  } catch { return null; }
}

/**
 * 単一銘柄クォート（TwelveData 互換 { close, change, percent_change } 形式）
 */
export async function getQuote(
  symbol: string
): Promise<{ close: string; change: string; percent_change: string } | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = getCache(cacheKey) as { close: string; change: string; percent_change: string } | null;
  if (cached) return cached;

  const meta = await fetchChartMeta(toYahooSymbol(symbol));
  if (!meta) return null;

  const result = {
    close:          String(meta.price),
    change:         String(meta.change),
    percent_change: String(meta.percentChange),
  };
  setCache(cacheKey, result, 120_000);
  return result;
}

/**
 * 複数銘柄クォートを並列取得（バッチ）
 */
export async function getBatchQuotes(
  symbols: string[]
): Promise<Record<string, { close: string; change: string; percent_change: string }> | null> {
  if (symbols.length === 0) return null;

  const results: Record<string, { close: string; change: string; percent_change: string }> = {};
  const uncached: string[] = [];

  for (const s of symbols) {
    const hit = getCache(`quote:${s}`) as { close: string; change: string; percent_change: string } | null;
    if (hit) results[s] = hit;
    else uncached.push(s);
  }
  if (uncached.length === 0) return results;

  // 並列取得（Yahoo Finance は寛大なレート制限）
  const fetched = await Promise.all(
    uncached.map(async (s) => ({ s, meta: await fetchChartMeta(toYahooSymbol(s)) }))
  );
  for (const { s, meta } of fetched) {
    if (!meta) continue;
    const result = {
      close:          String(meta.price),
      change:         String(meta.change),
      percent_change: String(meta.percentChange),
    };
    setCache(`quote:${s}`, result, 120_000);
    results[s] = result;
  }

  return results;
}

/**
 * スパークライン用クローズ価格配列を複数銘柄並列取得（5分キャッシュ）
 * interval=1h, range=5d → 直近5営業日の1時間足クローズ最大40本
 */
export async function getSparklines(
  symbols: string[]
): Promise<Record<string, number[]>> {
  const result: Record<string, number[]> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const cacheKey = `spark:${symbol}`;
      const cached = getCache(cacheKey) as number[] | null;
      if (cached) { result[symbol] = cached; return; }

      const yahooSymbol = toYahooSymbol(symbol);
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1h&range=5d&includePrePost=false`;
        const res  = await yfetch(url);
        const json = await res.json() as {
          chart?: { result?: Array<{
            timestamp?: number[];
            indicators?: { quote?: Array<{ close?: (number | null)[] }> };
          }> };
        };
        const r = json?.chart?.result?.[0];
        if (!r?.timestamp || !r.indicators?.quote?.[0]) return;
        const closes = (r.indicators.quote[0].close ?? [])
          .filter((c): c is number => c != null && c > 0)
          .slice(-40);
        if (closes.length >= 2) {
          setCache(cacheKey, closes, 5 * 60_000);
          result[symbol] = closes;
        }
      } catch { /* ignore */ }
    })
  );
  return result;
}

/**
 * 現在価格のみ取得（55秒キャッシュ）
 */
export async function getPrice(symbol: string): Promise<number | null> {
  const cacheKey = `price:${symbol}`;
  const cached = getCache(cacheKey) as { price: number } | null;
  if (cached) return cached.price;

  const meta = await fetchChartMeta(toYahooSymbol(symbol));
  if (!meta) return null;

  setCache(cacheKey, { price: meta.price }, 55_000);
  return meta.price;
}

/** クエリに日本語（ひらがな・カタカナ・漢字）が含まれるか判定 */
function isJapanese(text: string): boolean {
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text);
}

/**
 * シンボル検索（TwelveData 互換 { data: [...] } 形式）
 * 日本語クエリの場合は lang=ja-JP&region=JP で検索し、日本株を正しく返す
 */
export async function searchSymbols(query: string): Promise<{
  data: { symbol: string; instrument_name: string; instrument_type: string; exchange: string; country: string }[];
} | null> {
  const cacheKey = `search:${query}`;
  const cached = getCache(cacheKey) as { data: { symbol: string; instrument_name: string; instrument_type: string; exchange: string; country: string }[] } | null;
  if (cached) return cached;

  const isJP = isJapanese(query);
  const langParam = isJP ? "lang=ja-JP&region=JP" : "lang=en-US&region=US";

  try {
    // 日本語クエリ: Yahoo Finance Japan でも検索し結果をマージ
    const urls = isJP
      ? [
          `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&${langParam}&quotesCount=30&newsCount=0&enableFuzzyQuery=true`,
          `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=ja-JP&region=JP&quotesCount=30&newsCount=0`,
        ]
      : [
          `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&${langParam}&quotesCount=30&newsCount=0&enableFuzzyQuery=false`,
        ];

    type YFQuote = { symbol: string; shortname?: string; longname?: string; quoteType?: string; exchange?: string; exchDisp?: string };

    const responses = await Promise.allSettled(urls.map((url) => yfetch(url).then((r) => r.json())));
    const seen = new Set<string>();
    const merged: YFQuote[] = [];

    for (const res of responses) {
      if (res.status !== "fulfilled") continue;
      const json = res.value as { quotes?: YFQuote[] };
      for (const q of json?.quotes ?? []) {
        if (!q.symbol || seen.has(q.symbol)) continue;
        seen.add(q.symbol);
        merged.push(q);
      }
    }

    const result = {
      data: merged.map((q) => ({
        symbol:          q.symbol,
        instrument_name: q.longname || q.shortname || q.symbol,
        instrument_type: mapYahooType(q.quoteType || ""),
        exchange:        q.exchDisp || q.exchange || "",
        country:         isJP ? "JP" : "",
      })),
    };

    setCache(cacheKey, result, 10 * 60_000);
    return result;
  } catch { return null; }
}
