import { NextRequest, NextResponse } from "next/server";
import { createUser, signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "全ての項目を入力してください" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }

    const user = await createUser(name.trim(), email.trim(), password);
    const token = await signToken(user);

    const res = NextResponse.json({ user });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "サーバーエラーが発生しました";
    // Supabase: "User already registered"
    if (msg.toLowerCase().includes("already registered")) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
