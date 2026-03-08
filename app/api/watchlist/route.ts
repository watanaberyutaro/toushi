import { NextRequest, NextResponse } from "next/server";
import { serviceDb, getUserId } from "@/lib/db";
import { DEFAULT_WATCHLIST } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json(DEFAULT_WATCHLIST);

  try {
    const db = serviceDb();
    const { data, error } = await db
      .from("watchlist_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json(
      (data || []).map((r) => ({
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        type: r.type,
        createdAt: r.created_at,
      }))
    );
  } catch {
    return NextResponse.json(DEFAULT_WATCHLIST);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const { symbol, name, type } = await request.json();

  if (!userId) {
    return NextResponse.json({ id: Date.now().toString(), symbol, name, type, createdAt: new Date().toISOString() });
  }

  try {
    const db = serviceDb();
    const { data, error } = await db
      .from("watchlist_items")
      .insert([{ user_id: userId, symbol, name, type }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id, symbol: data.symbol, name: data.name, type: data.type, createdAt: data.created_at });
  } catch {
    return NextResponse.json({ id: Date.now().toString(), symbol, name, type, createdAt: new Date().toISOString() });
  }
}
