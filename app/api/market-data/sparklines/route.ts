import { NextRequest, NextResponse } from "next/server";
import { getSparklines } from "@/lib/finnhub";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }
  const symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
  if (symbols.length === 0) {
    return NextResponse.json({});
  }
  const data = await getSparklines(symbols);
  return NextResponse.json(data);
}
