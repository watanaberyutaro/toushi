import { NextRequest, NextResponse } from "next/server";

// Finnhub: institutional ownership for a specific stock
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/fund-ownership?symbol=${encodeURIComponent(symbol)}&limit=15&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const ownership = data?.ownership ?? [];

    return NextResponse.json(
      ownership
        .filter((o: Record<string, unknown>) => o.name && o.share)
        .map((o: Record<string, unknown>) => ({
          name: o.name,
          shares: Number(o.share),
          value: Number(o.value ?? 0),
          reportDate: o.reportDate ?? "",
          change: Number(o.change ?? 0),
        }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
