import { NextRequest, NextResponse } from "next/server";
import { serviceDb, getUserId } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json(null);

  try {
    const db = serviceDb();
    const { data } = await db
      .from("portfolio_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!data) return NextResponse.json(null);
    return NextResponse.json({
      cashJPY: parseFloat(data.cash_jpy),
      positions: data.positions,
      trades: data.trades,
    });
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ ok: false });

  try {
    const { cashJPY, positions, trades } = await request.json();
    const db = serviceDb();
    const { error } = await db
      .from("portfolio_state")
      .upsert({
        user_id: userId,
        cash_jpy: cashJPY,
        positions,
        trades: trades.slice(0, 100),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
