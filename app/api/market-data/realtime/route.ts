import { NextRequest, NextResponse } from "next/server";
import { getPrice, isFinnhubConfigured } from "@/lib/finnhub";

// 直前の価格を symbol ごとに保持（レート制限時のフォールバック用）
const lastKnown = new Map<string, number>();

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  if (!isFinnhubConfigured()) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  // getPrice() は内部で 55 秒キャッシュ + ノンブロッキングなレート制限チェックを行う。
  // → TwelveData への実際の呼び出しは最大 1 回/分になる。
  const price = await getPrice(symbol);

  if (price !== null) {
    lastKnown.set(symbol, price);
    return NextResponse.json({ price });
  }

  // レート制限 or エラー → 直前の既知価格を返す（キャッシュヒット扱い）
  const fallback = lastKnown.get(symbol);
  if (fallback !== undefined) {
    return NextResponse.json({ price: fallback, cached: true });
  }

  // 価格取得できない場合はクライアントに静かに通知（コンソールエラーを出さない）
  return NextResponse.json({ price: null });
}
