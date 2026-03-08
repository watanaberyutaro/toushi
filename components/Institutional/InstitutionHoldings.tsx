"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle, ExternalLink, ChevronDown, ChevronUp, Info } from "lucide-react";
import clsx from "clsx";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useAppStore } from "@/stores/useAppStore";

interface Institution {
  id: string;
  name: string;
  manager: string;
  style: string;
  description: string;
  focus: string[];
}

interface Holding {
  name: string;
  cusip: string;
  value: number;
  shares: number;
}

interface Holdings {
  holdings: Holding[];
  reportDate: string;
  period: string;
}

const STYLE_COLORS: Record<string, string> = {
  バリュー投資: "bg-accent-green/20 text-accent-green border-accent-green/30",
  アクティビスト: "bg-accent-red/20 text-accent-red border-accent-red/30",
  マクロ: "bg-accent-blue/20 text-accent-blue border-accent-blue/30",
  ディストレスト: "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30",
  テック特化: "bg-accent-purple/20 text-accent-purple border-accent-purple/30",
};

const ALL_STYLES = ["バリュー投資", "アクティビスト", "マクロ", "ディストレスト", "テック特化"];

// CIK マップ（外部リンク用）
const INST_CIK: Record<string, string> = {
  berkshire: "0001067983",
  pershing: "0001336528",
  bridgewater: "0001350694",
  appaloosa: "0000827054",
  "third-point": "0001418538",
  "tiger-global": "0001530965",
  coatue: "0001336702",
  duquesne: "0001418223",
};

interface ResolvedHolding {
  name: string;
  symbol: string | null;
  symbolName?: string;
  priceUSD: number | null;
}

export default function InstitutionHoldings() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<Holdings | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [showDesc, setShowDesc] = useState(true);
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ bought: number; failed: number } | null>(null);

  const handleBulkBuy = async () => {
    if (!data || data.holdings.length === 0 || buying) return;
    setBuying(true);
    setBuyResult(null);

    try {
      const { cashJPY, positions, buy: doBuy } = usePortfolioStore.getState();
      const { usdJpyRate } = useAppStore.getState();

      const portfolioValueJPY = Object.values(positions).reduce(
        (s, p) => s + p.quantity * p.lastPriceUSD * usdJpyRate,
        0
      );
      const totalAssetsJPY = cashJPY + portfolioValueJPY;

      const names = data.holdings.map((h) => h.name).join("|");
      const res = await fetch(`/api/institutional/resolve-prices?names=${encodeURIComponent(names)}`);
      const resolved: ResolvedHolding[] = await res.json();

      const instTotal = data.holdings.reduce((s, h) => s + h.value, 0);
      let bought = 0;
      let failed = 0;

      for (const item of resolved) {
        if (!item.symbol || !item.priceUSD || item.priceUSD <= 0) {
          failed++;
          continue;
        }
        const holding = data.holdings.find((h) => h.name === item.name);
        if (!holding) continue;

        const pct = holding.value / instTotal;
        const allocatedJPY = totalAssetsJPY * pct;
        const quantity = Math.floor(allocatedJPY / (item.priceUSD * usdJpyRate));

        if (quantity <= 0) { failed++; continue; }

        const err = doBuy(item.symbol, item.name, "stock", quantity, item.priceUSD, usdJpyRate);
        if (err) { failed++; } else { bought++; }
      }

      setBuyResult({ bought, failed });
    } catch {
      setBuyResult({ bought: 0, failed: -1 });
    } finally {
      setBuying(false);
    }
  };

  // 機関リストを取得
  useEffect(() => {
    fetch("/api/institutional/holdings")
      .then((r) => r.json())
      .then((list: Institution[]) => {
        setInstitutions(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .finally(() => setLoadingList(false));
  }, []);

  // 保有データを取得
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    fetch(`/api/institutional/holdings?id=${selectedId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedId]);

  const filtered = styleFilter
    ? institutions.filter((i) => i.style === styleFilter)
    : institutions;

  const selected = institutions.find((i) => i.id === selectedId);
  const total = data?.holdings.reduce((s, h) => s + h.value, 0) ?? 0;
  const maxValue = Math.max(...(data?.holdings.map((h) => h.value) ?? []), 1);

  // ポートフォリオ分析
  const top5pct =
    total > 0 && data
      ? (data.holdings.slice(0, 5).reduce((s, h) => s + h.value, 0) / total) * 100
      : 0;
  const top10pct =
    total > 0 && data
      ? (data.holdings.slice(0, 10).reduce((s, h) => s + h.value, 0) / total) * 100
      : 0;
  const concentration =
    top5pct >= 70 ? "超集中型" : top5pct >= 50 ? "集中型" : top5pct >= 35 ? "やや集中型" : "分散型";
  const concentrationColor =
    top5pct >= 70
      ? "text-accent-red"
      : top5pct >= 50
      ? "text-accent-yellow"
      : top5pct >= 35
      ? "text-accent-blue"
      : "text-accent-green";

  if (loadingList) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={18} className="animate-spin text-accent-purple" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-bg-primary">

      {/* ── スタイルフィルター ── */}
      <div className="px-3 pt-3 pb-2 flex-none">
        <p className="text-[10px] text-text-muted mb-1.5 uppercase tracking-wider">投資スタイルで絞り込み</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStyleFilter(null)}
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
              styleFilter === null
                ? "bg-text-secondary text-bg-primary border-text-secondary"
                : "bg-transparent text-text-muted border-border hover:border-text-muted"
            )}
          >
            すべて
          </button>
          {ALL_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => {
                setStyleFilter(styleFilter === style ? null : style);
                // フィルター変更時、現在の選択がフィルター外なら先頭を選択
                if (styleFilter !== style) {
                  const first = institutions.find((i) => i.style === style);
                  if (first) setSelectedId(first.id);
                }
              }}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
                styleFilter === style
                  ? STYLE_COLORS[style]
                  : "bg-transparent text-text-muted border-border hover:border-text-muted"
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* ── 機関選択カード ── */}
      <div className="px-3 pb-2 flex-none">
        <p className="text-[10px] text-text-muted mb-1.5 uppercase tracking-wider">
          機関を選択 ({filtered.length}件)
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {filtered.map((inst) => (
            <button
              key={inst.id}
              onClick={() => setSelectedId(inst.id)}
              className={clsx(
                "text-left rounded-lg p-2.5 border transition-all",
                selectedId === inst.id
                  ? "border-accent-purple bg-accent-purple/10"
                  : "border-border bg-bg-secondary hover:border-border-light hover:bg-bg-card"
              )}
            >
              <p className={clsx(
                "text-xs font-semibold truncate",
                selectedId === inst.id ? "text-text-primary" : "text-text-secondary"
              )}>
                {inst.name}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5 truncate">{inst.manager}</p>
              <span
                className={clsx(
                  "inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border",
                  STYLE_COLORS[inst.style] ?? "bg-bg-tertiary text-text-muted border-border"
                )}
              >
                {inst.style}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 選択中機関の説明 ── */}
      {selected && (
        <div className="mx-3 mb-2 rounded-lg border border-border bg-bg-secondary flex-none">
          <button
            onClick={() => setShowDesc(!showDesc)}
            className="w-full flex items-center justify-between px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <Info size={12} className="text-accent-purple flex-none" />
              <span className="text-xs font-semibold text-text-primary">{selected.name}</span>
              <span
                className={clsx(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                  STYLE_COLORS[selected.style] ?? "bg-bg-tertiary text-text-muted border-border"
                )}
              >
                {selected.style}
              </span>
            </div>
            {showDesc ? (
              <ChevronUp size={13} className="text-text-muted flex-none" />
            ) : (
              <ChevronDown size={13} className="text-text-muted flex-none" />
            )}
          </button>

          {showDesc && (
            <div className="px-3 pb-3 space-y-2 border-t border-border/50">
              <p className="text-xs text-text-secondary leading-relaxed mt-2">
                {selected.description}
              </p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                <span className="text-[10px] text-text-muted mr-1">注力分野：</span>
                {selected.focus.map((f) => (
                  <span
                    key={f}
                    className="px-1.5 py-0.5 bg-bg-tertiary border border-border rounded text-[10px] text-text-secondary"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ポートフォリオコンテンツ ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-text-muted">
          <RefreshCw size={18} className="animate-spin opacity-40" />
          <span className="text-xs">SEC EDGAR から取得中...</span>
        </div>
      ) : !data || data.holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-text-muted px-4">
          <AlertCircle size={22} className="opacity-30" />
          <span className="text-xs text-center">保有データが見つかりませんでした</span>
          <span className="text-xs text-center opacity-60">
            最新の13Fファイリングが未公開の可能性があります
          </span>
        </div>
      ) : (
        <div className="px-3 pb-4 space-y-2 flex-none">

          {/* サマリーカード */}
          <div className="bg-bg-secondary border border-border rounded-lg px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">ポートフォリオ推定総額</span>
              <span className="text-sm font-mono font-bold text-text-primary">
                ${(total / 1e9).toFixed(2)}B
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">開示銘柄数（上位30件）</span>
              <span className="text-xs font-mono text-text-secondary">
                {data.holdings.length}銘柄
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">集中度タイプ</span>
              <span className={clsx("text-xs font-mono font-semibold", concentrationColor)}>
                {concentration}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">最新報告期間</span>
              <span className="text-xs font-mono text-text-secondary">{data.period}（SEC 13F）</span>
            </div>
            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${INST_CIK[selectedId ?? ""] ?? ""}&type=13F-HR&dateb=&owner=include&count=10`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-accent-blue hover:underline"
            >
              <ExternalLink size={9} /> SEC EDGAR で原文を確認
            </a>

            {/* 一括購入ボタン */}
            <div className="pt-1 border-t border-border/50 space-y-1.5">
              <button
                onClick={handleBulkBuy}
                disabled={buying || loading}
                className={clsx(
                  "w-full py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5",
                  buying || loading
                    ? "bg-bg-tertiary text-text-muted border-border cursor-not-allowed"
                    : "bg-accent-green/20 text-accent-green border-accent-green/40 hover:bg-accent-green hover:text-white"
                )}
              >
                {buying ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" />
                    銘柄を解決中...
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                    </svg>
                    ポートフォリオを一括購入
                  </>
                )}
              </button>
              {buyResult && (
                <p className={clsx(
                  "text-[10px] text-center font-mono",
                  buyResult.failed === -1 ? "text-accent-red" : "text-accent-green"
                )}>
                  {buyResult.failed === -1
                    ? "エラーが発生しました"
                    : `${buyResult.bought}銘柄を購入${buyResult.failed > 0 ? `（${buyResult.failed}件スキップ）` : "しました"}`}
                </p>
              )}
            </div>
          </div>

          {/* ポートフォリオ集中度バー */}
          <div className="bg-bg-secondary border border-border rounded-lg px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-text-secondary">上位銘柄の集中率</p>
            <div className="space-y-1.5">
              {[
                { label: "上位5銘柄", pct: top5pct },
                { label: "上位10銘柄", pct: top10pct },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-text-muted">{label}</span>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        pct >= 70
                          ? "bg-accent-red"
                          : pct >= 50
                          ? "bg-accent-yellow"
                          : "bg-accent-green"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {top5pct >= 70
                ? "上位5銘柄に資産の7割以上を集中させる超集中型ポートフォリオです。強いコンビクションに基づく高集中戦略を採用しています。"
                : top5pct >= 50
                ? "上位5銘柄で過半数を占める集中型ポートフォリオです。厳選した銘柄に大きなウェイトを置く運用スタイルです。"
                : top5pct >= 35
                ? "ある程度の集中度を持ちながらも、一定の分散が図られたポートフォリオです。"
                : "幅広い銘柄に分散投資する分散型ポートフォリオです。特定銘柄への依存度が低い運用スタイルです。"}
            </p>
          </div>

          {/* 保有銘柄リスト */}
          <p className="text-[10px] text-text-muted uppercase tracking-wider pt-1">
            保有銘柄一覧（時価総額順）
          </p>
          {data.holdings.map((h, i) => {
            const pct = total > 0 ? (h.value / total) * 100 : 0;
            return (
              <div key={i} className="bg-bg-secondary border border-border/60 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-text-muted w-5 text-right flex-none">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {h.name}
                    </span>
                    {i < 3 && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-accent-purple/20 text-accent-purple border border-accent-purple/20 flex-none">
                        主要保有
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-semibold text-text-primary flex-none ml-2">
                    ${(h.value / 1e6).toFixed(0)}M
                  </span>
                </div>

                {/* バー */}
                <div className="flex items-center gap-2 ml-7">
                  <div className="flex-1 h-1 bg-bg-tertiary rounded-full">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        i < 3
                          ? "bg-accent-purple"
                          : i < 10
                          ? "bg-accent-blue"
                          : "bg-bg-hover"
                      )}
                      style={{ width: `${(h.value / maxValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-muted w-10 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1 ml-7">
                  <span className="text-[10px] text-text-muted font-mono">
                    {h.shares.toLocaleString("ja-JP")} 株
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    CUSIP: {h.cusip}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
