"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// beforeinstallprompt をできるだけ早くキャプチャ（モジュールロード時）
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // すでにインストール済み（スタンドアロンモード）なら表示しない
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    // ログイン直後フラグが立っていれば表示
    const shouldShow = localStorage.getItem("pwa-show-install") === "1";
    if (!shouldShow) return;

    // beforeinstallprompt が取れていない場合も iOS 向けに表示する
    setShow(true);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
    localStorage.removeItem("pwa-show-install");
    localStorage.setItem("pwa-install-done", "1");
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.removeItem("pwa-show-install");
    localStorage.setItem("pwa-install-done", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={handleDismiss}
      />

      {/* banner */}
      <div className="relative w-full max-w-sm mx-4 mb-6 bg-bg-card border border-border rounded-2xl shadow-2xl p-5 pointer-events-auto">
        {/* App icon + title */}
        <div className="flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt="icon"
            className="w-14 h-14 rounded-2xl border border-border/50"
          />
          <div>
            <p className="text-sm font-bold text-text-primary">AI Trading Assistant</p>
            <p className="text-xs text-text-muted mt-0.5">toushi.vercel.app</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          ホーム画面に追加してアプリとして快適に使用できます。オフライン時もチャートを閲覧できます。
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-accent-blue hover:bg-blue-700 text-white transition-colors"
          >
            インストール
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-bg-tertiary hover:bg-bg-hover text-text-secondary transition-colors border border-border"
          >
            後で
          </button>
        </div>

        {/* iOS 向け補足 */}
        <p className="text-[10px] text-text-muted text-center mt-3 leading-relaxed">
          iPhone の場合: Safari の
          <svg className="inline w-3 h-3 mx-0.5 text-accent-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          →「ホーム画面に追加」
        </p>
      </div>
    </div>
  );
}
