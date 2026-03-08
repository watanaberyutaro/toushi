"use client";

import { useEffect, useCallback } from "react";
import { usePortfolioStore } from "@/stores/usePortfolioStore";

export function usePortfolioSync() {
  const store = usePortfolioStore();

  // 初回: Supabaseから復元
  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.cashJPY === "number") {
          usePortfolioStore.setState({
            cashJPY: data.cashJPY,
            positions: data.positions ?? {},
            trades: data.trades ?? [],
          });
        }
      })
      .catch(() => {});
  }, []);

  // Supabase へ保存
  const sync = useCallback(() => {
    const { cashJPY, positions, trades } = usePortfolioStore.getState();
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashJPY, positions, trades }),
    }).catch(() => {});
  }, []);

  return { sync };
}
