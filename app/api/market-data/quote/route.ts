import { NextRequest, NextResponse } from "next/server";
import { getQuote, isFinnhubConfigured } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  if (!isFinnhubConfigured()) {
    return NextResponse.json({ error: "API key not configured" }, { status: 503 });
  }

  try {
    const raw = await getQuote(symbol);
    const data = raw as Record<string, string> | null;
    if (!data || data.code) {
      return NextResponse.json({ error: (data as Record<string,string>)?.message || "API error" }, { status: 429 });
    }
    return NextResponse.json({
      price: parseFloat(data.close),
      change: parseFloat(data.change),
      changePercent: parseFloat(data.percent_change),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}
