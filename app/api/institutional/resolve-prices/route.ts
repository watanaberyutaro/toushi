import { NextRequest, NextResponse } from "next/server";
import { searchSymbols, getPrice } from "@/lib/finnhub";

/**
 * 機関投資家の保有銘柄名（13F社名）→ Yahoo Finance シンボル + 現在価格に解決
 * GET /api/institutional/resolve-prices?names=APPLE INC|MICROSOFT CORP|...
 */
export async function GET(request: NextRequest) {
  const namesParam = request.nextUrl.searchParams.get("names");
  if (!namesParam) return NextResponse.json([]);

  const names = namesParam.split("|").map((n) => n.trim()).filter(Boolean).slice(0, 30);

  const resolved = await Promise.all(
    names.map(async (name) => {
      try {
        const search = await searchSymbols(name);
        const first = search?.data.find(
          (d) => d.instrument_type === "Common Stock" || d.instrument_type === "ETF"
        );
        if (!first) return { name, symbol: null, priceUSD: null };

        const priceUSD = await getPrice(first.symbol);
        return {
          name,
          symbol: first.symbol,
          symbolName: first.instrument_name,
          priceUSD,
        };
      } catch {
        return { name, symbol: null, priceUSD: null };
      }
    })
  );

  return NextResponse.json(resolved);
}
