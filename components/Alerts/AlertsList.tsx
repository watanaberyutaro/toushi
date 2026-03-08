"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { Bell, X, Trash2, CheckCircle } from "lucide-react";
import clsx from "clsx";

export default function AlertsList() {
  const { alerts, setAlerts, toggleAlerts } = useAppStore();

  useEffect(() => {
    // Load alerts
    const loadAlerts = async () => {
      try {
        const res = await fetch("/api/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch {}
    };
    loadAlerts();
  }, [setAlerts]);

  const deleteAlert = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    } catch {}
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-card border border-border rounded-lg w-96 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-accent-yellow" />
            <h3 className="text-sm font-semibold text-text-primary">価格アラート</h3>
            <span className="text-xs bg-accent-yellow/20 text-accent-yellow px-1.5 rounded font-mono">
              {alerts.filter((a) => a.isActive).length}件有効
            </span>
          </div>
          <button onClick={toggleAlerts} className="text-text-secondary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              <p>アラートが設定されていません</p>
              <p className="text-xs mt-1">AIチャットでアラートを設定できます</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={clsx(
                    "flex items-start justify-between p-3 rounded-lg border",
                    alert.isActive
                      ? "bg-bg-tertiary border-border"
                      : "bg-bg-tertiary/50 border-border/50 opacity-60"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={clsx(
                      "mt-0.5 flex-none",
                      alert.triggeredAt ? "text-accent-green" : "text-accent-yellow"
                    )}>
                      {alert.triggeredAt ? <CheckCircle size={13} /> : <Bell size={13} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-text-primary">{alert.symbol}</span>
                        <span className={clsx(
                          "text-xs px-1 rounded font-mono",
                          alert.condition === "above" ? "bg-accent-green/20 text-accent-green" : "bg-accent-red/20 text-accent-red"
                        )}>
                          {alert.condition === "above" ? "↑" : "↓"} {alert.price.toFixed(4)}
                        </span>
                      </div>
                      {alert.message && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">{alert.message}</p>
                      )}
                      <p className="text-xs text-text-muted font-mono mt-0.5">
                        {new Date(alert.createdAt).toLocaleDateString("ja-JP")}
                        {alert.triggeredAt && ` → 発動: ${new Date(alert.triggeredAt).toLocaleTimeString("ja-JP")}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="flex-none p-1 text-text-muted hover:text-accent-red transition-colors ml-2"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
