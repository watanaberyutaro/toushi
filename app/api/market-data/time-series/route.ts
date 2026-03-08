import { NextRequest, NextResponse } from "next/server";
import { getTimeSeries, isFinnhubConfigured } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const interval = request.nextUrl.searchParams.get("interval") || "1h";
  const outputsize = parseInt(request.nextUrl.searchParams.get("outputsize") || "200");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  if (!isFinnhubConfigured()) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  const raw = await getTimeSeries(symbol, interval, outputsize);
  const data = raw as Record<string, unknown> | null;

  if (!data || data.code) {
    const status = (data?.code as number) === 429 ? 429 : 502;
    const msg = (data?.message as string) || "データを取得できませんでした";
    return NextResponse.json({ error: msg }, { status });
  }

  if (!data.values || (data.values as unknown[]).length === 0) {
    return NextResponse.json({ error: "データがありません（取引時間外または非対応シンボル）" }, { status: 404 });
  }

  const values = data.values as Record<string, string>[];
  const ohlcv = [...values]
    .map((v) => ({
      time: Math.floor(new Date(v.datetime).getTime() / 1000),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseInt(v.volume) : undefined,
    }))
    .sort((a, b) => a.time - b.time);

  return NextResponse.json(ohlcv);
}
