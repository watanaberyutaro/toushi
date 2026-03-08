import { NextRequest, NextResponse } from "next/server";
import { getBatchQuotes, isFinnhubConfigured } from "@/lib/finnhub";

// 複数銘柄のクォートを1回のAPIコールで取得するバッチエンドポイント
// ?symbols=AAPL,TSLA,BTC/USD,...
export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols parameter is required" }, { status: 400 });
  }

  const symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
  if (symbols.length === 0) {
    return NextResponse.json({});
  }

  if (!isFinnhubConfigured()) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  try {
    const raw = await getBatchQuotes(symbols);
    if (!raw) return NextResponse.json({});

    // レスポンスを { symbol: { price, change, changePercent } } 形式に変換
    const result: Record<string, { price: number; change: number; changePercent: number }> = {};
    for (const [symbol, q] of Object.entries(raw)) {
      const data = q as Record<string, string>;
      if (data?.close) {
        result[symbol] = {
          price: parseFloat(data.close),
          change: parseFloat(data.change ?? "0"),
          changePercent: parseFloat(data.percent_change ?? "0"),
        };
      }
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}
