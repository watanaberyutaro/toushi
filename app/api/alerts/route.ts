import { NextRequest, NextResponse } from "next/server";
import { serviceDb, getUserId } from "@/lib/db";

const toAlert = (a: Record<string, unknown>) => ({
  id: a.id,
  symbol: a.symbol,
  condition: a.condition,
  price: parseFloat(a.price as string),
  message: a.message,
  isActive: a.is_active,
  createdAt: a.created_at,
  triggeredAt: a.triggered_at,
});

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json([]);

  try {
    const db = serviceDb();
    const { data, error } = await db
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json((data || []).map(toAlert));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const { symbol, condition, price, message } = await request.json();

  const fallback = {
    id: Date.now().toString(),
    symbol, condition, price,
    message: message || "",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (!userId) return NextResponse.json(fallback);

  try {
    const db = serviceDb();
    const { data, error } = await db
      .from("alerts")
      .insert([{ user_id: userId, symbol, condition, price, message: message || "", is_active: true }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(toAlert(data));
  } catch {
    return NextResponse.json(fallback);
  }
}
