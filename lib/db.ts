import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE } from "./auth";

export function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  return user?.id ?? null;
}
