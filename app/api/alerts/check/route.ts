import { NextResponse } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { getQuote, isFinnhubConfigured } from "@/lib/finnhub";
import { MOCK_QUOTES } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ checked: 0, triggered: 0 });
  }

  const supabase = createServiceClient();

  try {
    const { data: alerts } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_active", true);

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: 0 });
    }

    let triggered = 0;

    // Group by symbol to minimize API calls
    const symbolAlerts = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      if (!symbolAlerts.has(alert.symbol)) {
        symbolAlerts.set(alert.symbol, []);
      }
      symbolAlerts.get(alert.symbol)!.push(alert);
    }

    for (const [symbol, symbolAlertList] of symbolAlerts) {
      let currentPrice: number;

      if (isFinnhubConfigured()) {
        const raw = await getQuote(symbol);
        const quote = raw as Record<string, string> | null;
        currentPrice = quote?.close ? parseFloat(quote.close) : 0;
      } else {
        currentPrice = MOCK_QUOTES[symbol]?.price || 0;
      }

      if (!currentPrice) continue;

      for (const alert of symbolAlertList) {
        const alertPrice = parseFloat(alert.price);
        const shouldTrigger =
          (alert.condition === "above" && currentPrice >= alertPrice) ||
          (alert.condition === "below" && currentPrice <= alertPrice);

        if (shouldTrigger) {
          await supabase
            .from("alerts")
            .update({ is_active: false, triggered_at: new Date().toISOString() })
            .eq("id", alert.id);
          triggered++;
        }
      }
    }

    return NextResponse.json({ checked: alerts.length, triggered });
  } catch {
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
