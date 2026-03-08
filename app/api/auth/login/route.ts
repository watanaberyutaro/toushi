import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    const user = await verifyCredentials(email.trim(), password);
    if (!user) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

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
  } catch {
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
