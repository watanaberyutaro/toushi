import { NextRequest, NextResponse } from "next/server";
import { getTechnicalIndicator, isTwelvedataConfigured } from "@/lib/twelvedata";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const indicator = request.nextUrl.searchParams.get("indicator");
  const interval = request.nextUrl.searchParams.get("interval") || "1h";

  if (!symbol || !indicator) {
    return NextResponse.json({ error: "Symbol and indicator are required" }, { status: 400 });
  }

  if (!isTwelvedataConfigured()) {
    return NextResponse.json({ mock: true, values: [] });
  }

  try {
    const data = await getTechnicalIndicator(symbol, indicator, interval);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch indicator" }, { status: 500 });
  }
}
