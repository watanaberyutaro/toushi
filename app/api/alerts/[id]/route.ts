import { NextRequest, NextResponse } from "next/server";
import { serviceDb, getUserId } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ success: true });

  try {
    const db = serviceDb();
    const { error } = await db
      .from("alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
