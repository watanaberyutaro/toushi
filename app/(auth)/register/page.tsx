"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-accent-blue/20 flex items-center justify-center">
          <TrendingUp size={18} className="text-accent-blue" />
        </div>
        <span className="text-lg font-bold text-text-primary">AI Trading Assistant</span>
      </div>

      {/* Card */}
      <div className="bg-bg-card border border-border rounded-2xl p-8 shadow-xl">
        <h1 className="text-xl font-bold text-text-primary mb-1">新規登録</h1>
        <p className="text-sm text-text-muted mb-6">アカウントを作成してください</p>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              お名前
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="山田 太郎"
                className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              メールアドレス
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="example@email.com"
                className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              パスワード
              <span className="text-text-muted font-normal ml-1">（8文字以上）</span>
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8文字以上のパスワード"
                className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-10 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              パスワード（確認）
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="パスワードを再入力"
                className="w-full bg-bg-tertiary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg py-2.5 transition-colors mt-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            {isLoading ? "登録中..." : "アカウントを作成"}
          </button>
        </form>
      </div>

      {/* Login link */}
      <p className="text-center text-sm text-text-muted mt-4">
        既にアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-accent-blue hover:underline font-medium">
          ログイン
        </Link>
      </p>
    </div>
  );
}
