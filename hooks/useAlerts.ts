import { useState, useEffect, useCallback } from "react";
import { Alert } from "@/types";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const createAlert = useCallback(
    async (
      symbol: string,
      condition: "above" | "below",
      price: number,
      message?: string
    ) => {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, condition, price, message }),
        });
        if (res.ok) {
          const newAlert = await res.json();
          setAlerts((prev) => [newAlert, ...prev]);
          return newAlert;
        }
      } catch {}

      // Fallback
      const newAlert: Alert = {
        id: Date.now().toString(),
        symbol,
        condition,
        price,
        message: message || "",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setAlerts((prev) => [newAlert, ...prev]);
      return newAlert;
    },
    []
  );

  const deleteAlert = useCallback(async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    } catch {}
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const checkAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/check");
      if (res.ok) {
        const result = await res.json();
        if (result.triggered > 0) {
          // Refresh alerts to get updated statuses
          fetchAlerts();
        }
        return result;
      }
    } catch {}
    return { checked: 0, triggered: 0 };
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    createAlert,
    deleteAlert,
    checkAlerts,
    refresh: fetchAlerts,
  };
}
