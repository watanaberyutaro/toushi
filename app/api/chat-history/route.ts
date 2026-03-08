import { NextRequest, NextResponse } from "next/server";
import { serviceDb, getUserId } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json([]);

  try {
    const db = serviceDb();
    const { data, error } = await db
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;
    return NextResponse.json(
      (data || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? [],
        chartActions: m.chart_actions ?? [],
        timestamp: m.created_at,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ ok: false });

  try {
    const { role, content, sources, chartActions } = await request.json();
    const db = serviceDb();
    const { error } = await db.from("chat_messages").insert([{
      user_id: userId,
      role,
      content,
      sources: sources ?? [],
      chart_actions: chartActions ?? [],
    }]);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ ok: false });

  try {
    const db = serviceDb();
    const { error } = await db
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
