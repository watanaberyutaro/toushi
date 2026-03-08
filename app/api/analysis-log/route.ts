import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("analysis_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ id: Date.now().toString(), ...body });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("analysis_log")
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ id: Date.now().toString(), ...body });
  }
}
