"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import StockOwnership from "./StockOwnership";
import InstitutionHoldings from "./InstitutionHoldings";
import { Building2, BarChart3 } from "lucide-react";

type SubTab = "stock" | "institution";

export default function InstitutionalPanel() {
  const [subTab, setSubTab] = useState<SubTab>("stock");
  const { selectedSymbol } = useAppStore();

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-none">
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-accent-purple" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            機関投資家動向
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-border flex-none">
        <button
          onClick={() => setSubTab("stock")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            subTab === "stock"
              ? "border-accent-purple text-accent-purple"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          <BarChart3 size={11} />
          銘柄別保有状況
        </button>
        <button
          onClick={() => setSubTab("institution")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            subTab === "institution"
              ? "border-accent-purple text-accent-purple"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          <Building2 size={11} />
          機関ポートフォリオ
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {subTab === "stock" ? (
          <StockOwnership symbol={selectedSymbol?.symbol ?? null} />
        ) : (
          <InstitutionHoldings />
        )}
      </div>
    </div>
  );
}
