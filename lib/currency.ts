export type Currency = "USD" | "JPY";

/**
 * 変換が必要かどうかを判定する
 * - FXペア（USD/JPY, EUR/USD 等）はそもそも為替レートなので変換しない
 * - JPX上場銘柄（7203等）は既に円建てなので変換しない
 * - 上記以外のUSD建て資産（米国株・暗号資産）は変換する
 */
export function needsConversion(
  symbol: string,
  type: "stock" | "forex" | "crypto" | "etf",
  exchange?: string
): boolean {
  if (type === "forex") return false;
  if (exchange === "JPX") return false;
  // シンボルが日本株っぽい4〜5桁の数字の場合も除外
  if (/^\d{4,5}$/.test(symbol)) return false;
  return true;
}

/** 価格をtarget通貨に変換する */
export function convertPrice(
  price: number,
  target: Currency,
  usdJpyRate: number,
  symbol: string,
  type: "stock" | "forex" | "crypto" | "etf",
  exchange?: string
): number {
  if (target === "JPY" && needsConversion(symbol, type, exchange)) {
    return price * usdJpyRate;
  }
  return price;
}

/** 通貨に応じた価格フォーマット */
export function formatPrice(
  price: number,
  symbol: string,
  currency: Currency
): string {
  if (!price && price !== 0) return "---";

  if (currency === "JPY") {
    // 円表示：小数点なし or 小数2桁
    if (price >= 100) {
      return price.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
    }
    return price.toFixed(2);
  }

  // USD表示
  if (symbol?.includes("JPY")) return price.toFixed(3);
  if (price >= 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price < 1) return price.toFixed(6);
  if (price < 10) return price.toFixed(4);
  return price.toFixed(2);
}

/** 通貨記号を返す */
export function currencySymbol(currency: Currency): string {
  return currency === "JPY" ? "¥" : "$";
}
