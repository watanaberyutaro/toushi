"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WatchlistPanel from "@/components/Watchlist/WatchlistPanel";
import MiniWatchlist from "@/components/Watchlist/MiniWatchlist";
import ChartContainer from "@/components/Chart/ChartContainer";
import ChatPanel from "@/components/Chat/ChatPanel";
import AlertsList from "@/components/Alerts/AlertsList";
import AddSymbolModal from "@/components/Watchlist/AddSymbolModal";
import PortfolioPanel from "@/components/Portfolio/PortfolioPanel";
import InstitutionalPanel from "@/components/Institutional/InstitutionalPanel";
import { usePortfolioSync } from "@/hooks/usePortfolioSync";
import { useAppStore } from "@/stores/useAppStore";
import { DEFAULT_WATCHLIST } from "@/lib/mock-data";
import { MessageSquare, Briefcase, Building2, LineChart, LogOut, User } from "lucide-react";
import clsx from "clsx";

type ActiveTab = "chat" | "portfolio" | "institutional";
type MobileTab = "chart" | "chat" | "portfolio" | "institutional";

interface AuthUser { id: string; name: string; email: string; }

export default function TradingDashboard() {
  const { watchlist, setWatchlist, setSelectedSymbol, showAlerts, showAddSymbol, setUsdJpyRate } = useAppStore();
  const initialized = useRef(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chart");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const router = useRouter();
  usePortfolioSync();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const current = useAppStore.getState().watchlist;
    if (current.length > 0) {
      setSelectedSymbol({ id: current[0].id, symbol: current[0].symbol, name: current[0].name, type: current[0].type });
    } else {
      setWatchlist(DEFAULT_WATCHLIST);
      setSelectedSymbol({ id: DEFAULT_WATCHLIST[0].id, symbol: DEFAULT_WATCHLIST[0].symbol, name: DEFAULT_WATCHLIST[0].name, type: DEFAULT_WATCHLIST[0].type });
    }
    const rateTimer = setTimeout(async () => {
      try {
        const res = await fetch("/api/market-data/realtime?symbol=USD%2FJPY");
        if (res.ok) {
          const data = await res.json();
          if (data.price) setUsdJpyRate(data.price);
        }
      } catch {}
    }, 2000);
    return () => clearTimeout(rateTimer);
  }, [setWatchlist, setSelectedSymbol, setUsdJpyRate]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setAuthUser(d.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const RIGHT_SECTIONS: { key: ActiveTab; label: string; icon: React.ReactNode; accent: string; content: React.ReactNode }[] = [
    { key: "chat",          label: "AI",       icon: <MessageSquare size={14} />, accent: "text-accent-blue",   content: <ChatPanel /> },
    { key: "portfolio",     label: "資産",     icon: <Briefcase size={14} />,    accent: "text-accent-green",  content: <PortfolioPanel /> },
    { key: "institutional", label: "機関",     icon: <Building2 size={14} />,    accent: "text-accent-purple", content: <InstitutionalPanel /> },
  ];

  const MOBILE_TABS: { key: MobileTab; label: string; icon: React.ReactNode }[] = [
    { key: "chart",         label: "チャート", icon: <LineChart size={18} /> },
    { key: "chat",          label: "AI",       icon: <MessageSquare size={18} /> },
    { key: "portfolio",     label: "資産",     icon: <Briefcase size={18} /> },
    { key: "institutional", label: "機関",     icon: <Building2 size={18} /> },
  ];

  return (
    <div className="flex flex-col h-screen h-dvh w-screen overflow-hidden bg-bg-primary">

      {/* トップバー */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border flex-none">
        <span className="text-xs font-semibold text-text-muted tracking-widest uppercase">AI Trading</span>
        {authUser && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
              <User size={12} className="text-text-muted" />
              <span>{authUser.name}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-red transition-colors" title="ログアウト">
              <LogOut size={12} />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        )}
      </div>

      {/* デスクトップレイアウト (md+) */}
      <div className="hidden md:flex flex-1 overflow-hidden">

        {/* 左: ウォッチリスト */}
        <div className="flex-none w-64 border-r border-border overflow-hidden flex flex-col bg-bg-secondary">
          <WatchlistPanel />
        </div>

        {/* 中央: チャート + ミニウォッチリスト */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-[13] min-h-0 overflow-hidden"><ChartContainer /></div>
          <div className="flex-[7] min-h-0 overflow-hidden border-t border-border"><MiniWatchlist /></div>
        </div>

        {/* 右: タブパネル（開閉可能サイドバー） */}
        <div
          className="flex-none flex border-l border-border bg-bg-secondary overflow-hidden transition-all duration-200"
          style={{ width: rightOpen ? "480px" : "36px" }}
        >
          {/* サイドバートグルボタン（常時表示） */}
          <div className="flex-none w-9 flex flex-col items-center pt-2 border-r border-border">
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted hover:text-text-secondary"
              title={rightOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points={rightOpen ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
              </svg>
            </button>
          </div>

          {/* タブパネル本体（サイドバー開時のみ表示） */}
          {rightOpen && (
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* タブバー */}
              <div className="flex border-b border-border flex-none">
                {RIGHT_SECTIONS.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => setActiveTab(section.key)}
                    className={clsx(
                      "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors border-b-2",
                      activeTab === section.key
                        ? section.accent + " border-current"
                        : "text-text-muted hover:text-text-secondary border-transparent"
                    )}
                  >
                    {section.icon}
                    <span>{section.label}</span>
                  </button>
                ))}
              </div>

              {/* アクティブタブのコンテンツ */}
              <div className="flex-1 overflow-hidden">
                {RIGHT_SECTIONS.find((s) => s.key === activeTab)?.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* モバイルレイアウト (< md) */}
      <div className="flex md:hidden flex-1 overflow-hidden flex-col">
        <div className="flex-1 overflow-hidden">
          {mobileTab === "chart" && (
            <div className="flex flex-col h-full">
              <div className="flex-[13] min-h-0 overflow-hidden"><ChartContainer /></div>
              <div className="flex-[7] min-h-0 overflow-hidden border-t border-border"><MiniWatchlist /></div>
            </div>
          )}
          {mobileTab === "chat"          && <ChatPanel />}
          {mobileTab === "portfolio"     && <PortfolioPanel />}
          {mobileTab === "institutional" && <InstitutionalPanel />}
        </div>
        <div className="flex-none flex items-stretch border-t border-border bg-bg-secondary">
          {MOBILE_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMobileTab(key)}
              className={clsx("flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors", mobileTab === key ? "text-accent-blue" : "text-text-muted")}
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showAlerts    && <AlertsList />}
      {showAddSymbol && <AddSymbolModal />}
    </div>
  );
}
