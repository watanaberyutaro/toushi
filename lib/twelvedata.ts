const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY;
const BASE_URL = "https://api.twelvedata.com";

export const isTwelvedataConfigured = () => !!TWELVEDATA_API_KEY;

// ─── インメモリキャッシュ ──────────────────────────────────────
interface CacheEntry { data: unknown; expiresAt: number; }
const cache = new Map<string, CacheEntry>();

function getCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── スライディングウィンドウ式レートリミッター ──────────────
// TwelveData 無料プラン: 8リクエスト/分
const MAX_PER_MINUTE = 7;          // 安全マージンを取って7に設定
const WINDOW_MS      = 61_000;     // 61秒ウィンドウ
const timestamps: number[] = [];
const pending: Array<() => void> = [];
let draining = false;

function drain() {
  if (draining || pending.length === 0) return;
  draining = true;

  const now = Date.now();
  // 1分以上前のタイムスタンプを除去
  while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) timestamps.shift();

  if (timestamps.length < MAX_PER_MINUTE) {
    timestamps.push(now);
    const task = pending.shift()!;
    draining = false;
    task();
    // 次のタスクをスケジュール
    if (pending.length > 0) setTimeout(drain, 0);
  } else {
    // ウィンドウが空くまで待機
    const waitMs = timestamps[0] + WINDOW_MS - now + 50;
    setTimeout(() => { draining = false; drain(); }, waitMs);
  }
}

function rateLimitedFetch(url: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    pending.push(async () => {
      try { resolve(await fetch(url)); }
      catch (err) { reject(err); }
    });
    drain();
  });
}

// TwelveDataのエラーレスポンスか判定
function isRateLimitError(data: Record<string, unknown>): boolean {
  return data?.code === 429 || (typeof data?.message === "string" && data.message.includes("rate limit"));
}

// ─── API関数 ──────────────────────────────────────────────────

/** 複数銘柄のクォートを1回のAPIコールで取得（バッチ） */
export async function getBatchQuotes(symbols: string[]) {
  if (!isTwelvedataConfigured() || symbols.length === 0) return null;

  // 全銘柄がキャッシュ済みならAPIを叩かない
  const results: Record<string, unknown> = {};
  const uncached: string[] = [];
  for (const s of symbols) {
    const hit = getCache(`quote:${s}`);
    if (hit) results[s] = hit;
    else uncached.push(s);
  }
  if (uncached.length === 0) return results;

  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(uncached.join(","))}&apikey=${TWELVEDATA_API_KEY}`;
  const res = await rateLimitedFetch(url);
  const data = await res.json();

  // 単一銘柄の場合はオブジェクト、複数の場合はシンボルをキーとした辞書
  if (uncached.length === 1) {
    const s = uncached[0];
    if (data?.close && !isRateLimitError(data)) {
      setCache(`quote:${s}`, data, 120_000);
      results[s] = data;
    }
  } else if (typeof data === "object" && data !== null) {
    for (const [s, q] of Object.entries(data as Record<string, unknown>)) {
      const qData = q as Record<string, unknown>;
      if (qData?.close && !isRateLimitError(qData)) {
        setCache(`quote:${s}`, qData, 120_000);
        results[s] = qData;
      }
    }
  }

  return results;
}

export async function getTimeSeries(symbol: string, interval: string, outputsize = 200) {
  if (!isTwelvedataConfigured()) return null;

  const cacheKey = `ts:${symbol}:${interval}:${outputsize}`;
  const ttl = ["1min", "5min"].includes(interval) ? 60_000 : 5 * 60_000;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVEDATA_API_KEY}`;

  // 429時に1回リトライ
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await rateLimitedFetch(url);
    const data = await res.json() as Record<string, unknown>;

    if (isRateLimitError(data)) {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    if (data?.values) {
      setCache(cacheKey, data, ttl);
      return data;
    }
    return data; // エラーレスポンスをそのまま返す
  }
  return { code: 429, message: "レート制限に達しました。しばらく待ってから再試行してください。" };
}

/**
 * 現在価格を取得（55秒キャッシュ）。
 * レートリミット残量がない場合はキューに積まず null を返す（ノンブロッキング）。
 */
export async function getPrice(symbol: string): Promise<number | null> {
  if (!isTwelvedataConfigured()) return null;

  const cacheKey = `price:${symbol}`;
  const cached = getCache(cacheKey) as { price: number } | null;
  if (cached) return cached.price;

  // レートリミット確認：キャパがなければスキップ（キューには積まない）
  const now = Date.now();
  while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) timestamps.shift();
  if (timestamps.length >= MAX_PER_MINUTE) return null;

  timestamps.push(now);
  try {
    const url = `${BASE_URL}/price?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVEDATA_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json() as Record<string, unknown>;
    if (data?.price && !isRateLimitError(data)) {
      const price = parseFloat(data.price as string);
      setCache(cacheKey, { price }, 55_000); // 55秒キャッシュ → 最大1回/分
      return price;
    }
  } catch { /* network error */ }
  return null;
}

export async function getQuote(symbol: string) {
  if (!isTwelvedataConfigured()) return null;

  const cacheKey = `quote:${symbol}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVEDATA_API_KEY}`;
  const res = await rateLimitedFetch(url);
  const data = await res.json() as Record<string, unknown>;
  if (data?.close && !isRateLimitError(data)) setCache(cacheKey, data, 120_000);
  return data;
}

export async function searchSymbols(query: string, type?: string) {
  if (!isTwelvedataConfigured()) return null;

  const cacheKey = `search:${query}:${type ?? "all"}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ symbol: query, apikey: TWELVEDATA_API_KEY!, outputsize: "30" });
  if (type) params.set("type", type);
  const res = await rateLimitedFetch(`${BASE_URL}/symbol_search?${params}`);
  const data = await res.json() as Record<string, unknown>;
  if (data?.data) setCache(cacheKey, data, 10 * 60_000);
  return data;
}

export async function getTechnicalIndicator(
  symbol: string, indicator: string, interval: string,
  params: Record<string, string | number> = {}
) {
  if (!isTwelvedataConfigured()) return null;

  const cacheKey = `tech:${symbol}:${indicator}:${interval}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const queryParams = new URLSearchParams({
    symbol, interval, apikey: TWELVEDATA_API_KEY!, outputsize: "50",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await rateLimitedFetch(`${BASE_URL}/${indicator}?${queryParams}`);
  const data = await res.json() as Record<string, unknown>;
  if (data?.values) setCache(cacheKey, data, 5 * 60_000);
  return data;
}
