import { NextRequest, NextResponse } from "next/server";
import { searchSymbols, isFinnhubConfigured } from "@/lib/finnhub";

// 日本株フォールバックリスト（日本語名検索対応）
// symbol は Yahoo Finance 形式（末尾 .T = 東証）
const JP_STOCKS: { symbol: string; name: string; jaName: string; type: string; exchange: string }[] = [
  { symbol: "8035.T",  name: "Tokyo Electron Ltd.",           jaName: "東京エレクトロン",       type: "Common Stock", exchange: "TSE" },
  { symbol: "7203.T",  name: "Toyota Motor Corporation",      jaName: "トヨタ自動車",           type: "Common Stock", exchange: "TSE" },
  { symbol: "6758.T",  name: "Sony Group Corporation",        jaName: "ソニーグループ",         type: "Common Stock", exchange: "TSE" },
  { symbol: "6861.T",  name: "Keyence Corporation",           jaName: "キーエンス",             type: "Common Stock", exchange: "TSE" },
  { symbol: "9984.T",  name: "SoftBank Group Corp.",          jaName: "ソフトバンクグループ",   type: "Common Stock", exchange: "TSE" },
  { symbol: "7974.T",  name: "Nintendo Co., Ltd.",            jaName: "任天堂",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "8306.T",  name: "Mitsubishi UFJ Financial Group",jaName: "三菱UFJフィナンシャル",  type: "Common Stock", exchange: "TSE" },
  { symbol: "6954.T",  name: "Fanuc Corporation",             jaName: "ファナック",             type: "Common Stock", exchange: "TSE" },
  { symbol: "4063.T",  name: "Shin-Etsu Chemical Co., Ltd.",  jaName: "信越化学工業",           type: "Common Stock", exchange: "TSE" },
  { symbol: "6981.T",  name: "Murata Manufacturing Co., Ltd.",jaName: "村田製作所",             type: "Common Stock", exchange: "TSE" },
  { symbol: "9432.T",  name: "Nippon Telegraph and Telephone",jaName: "NTT（日本電信電話）",    type: "Common Stock", exchange: "TSE" },
  { symbol: "9433.T",  name: "KDDI Corporation",              jaName: "KDDI",                   type: "Common Stock", exchange: "TSE" },
  { symbol: "9984.T",  name: "SoftBank Group Corp.",          jaName: "ソフトバンク",           type: "Common Stock", exchange: "TSE" },
  { symbol: "6501.T",  name: "Hitachi, Ltd.",                 jaName: "日立製作所",             type: "Common Stock", exchange: "TSE" },
  { symbol: "6752.T",  name: "Panasonic Holdings Corporation",jaName: "パナソニック",           type: "Common Stock", exchange: "TSE" },
  { symbol: "6702.T",  name: "Fujitsu Limited",               jaName: "富士通",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "4502.T",  name: "Takeda Pharmaceutical Co.",     jaName: "武田薬品工業",           type: "Common Stock", exchange: "TSE" },
  { symbol: "4503.T",  name: "Astellas Pharma Inc.",          jaName: "アステラス製薬",         type: "Common Stock", exchange: "TSE" },
  { symbol: "4911.T",  name: "Shiseido Company, Limited",     jaName: "資生堂",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "9983.T",  name: "Fast Retailing Co., Ltd.",      jaName: "ファーストリテイリング（ユニクロ）", type: "Common Stock", exchange: "TSE" },
  { symbol: "8058.T",  name: "Mitsubishi Corporation",        jaName: "三菱商事",               type: "Common Stock", exchange: "TSE" },
  { symbol: "8001.T",  name: "Itochu Corporation",            jaName: "伊藤忠商事",             type: "Common Stock", exchange: "TSE" },
  { symbol: "8031.T",  name: "Mitsui & Co., Ltd.",            jaName: "三井物産",               type: "Common Stock", exchange: "TSE" },
  { symbol: "8411.T",  name: "Mizuho Financial Group, Inc.",  jaName: "みずほフィナンシャルグループ", type: "Common Stock", exchange: "TSE" },
  { symbol: "8316.T",  name: "Sumitomo Mitsui Financial Group",jaName: "三井住友フィナンシャル", type: "Common Stock", exchange: "TSE" },
  { symbol: "6098.T",  name: "Recruit Holdings Co., Ltd.",    jaName: "リクルートホールディングス", type: "Common Stock", exchange: "TSE" },
  { symbol: "7741.T",  name: "HOYA Corporation",              jaName: "HOYA",                   type: "Common Stock", exchange: "TSE" },
  { symbol: "4901.T",  name: "Fujifilm Holdings Corporation", jaName: "富士フイルム",           type: "Common Stock", exchange: "TSE" },
  { symbol: "6902.T",  name: "Denso Corporation",             jaName: "デンソー",               type: "Common Stock", exchange: "TSE" },
  { symbol: "7267.T",  name: "Honda Motor Co., Ltd.",         jaName: "本田技研工業（ホンダ）", type: "Common Stock", exchange: "TSE" },
  { symbol: "7201.T",  name: "Nissan Motor Co., Ltd.",        jaName: "日産自動車",             type: "Common Stock", exchange: "TSE" },
  { symbol: "7270.T",  name: "Subaru Corporation",            jaName: "SUBARU（スバル）",       type: "Common Stock", exchange: "TSE" },
  { symbol: "7269.T",  name: "Suzuki Motor Corporation",      jaName: "スズキ",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "6367.T",  name: "Daikin Industries, Ltd.",       jaName: "ダイキン工業",           type: "Common Stock", exchange: "TSE" },
  { symbol: "6503.T",  name: "Mitsubishi Electric Corporation",jaName: "三菱電機",             type: "Common Stock", exchange: "TSE" },
  { symbol: "6723.T",  name: "Renesas Electronics Corporation",jaName: "ルネサスエレクトロニクス", type: "Common Stock", exchange: "TSE" },
  { symbol: "4519.T",  name: "Chugai Pharmaceutical Co.",     jaName: "中外製薬",               type: "Common Stock", exchange: "TSE" },
  { symbol: "2914.T",  name: "Japan Tobacco International",   jaName: "日本たばこ産業（JT）",   type: "Common Stock", exchange: "TSE" },
  { symbol: "3382.T",  name: "Seven & i Holdings Co., Ltd.",  jaName: "セブン＆アイ・ホールディングス", type: "Common Stock", exchange: "TSE" },
  { symbol: "8802.T",  name: "Mitsubishi Estate Co., Ltd.",   jaName: "三菱地所",               type: "Common Stock", exchange: "TSE" },
  { symbol: "9020.T",  name: "East Japan Railway Company",    jaName: "JR東日本",               type: "Common Stock", exchange: "TSE" },
  { symbol: "9022.T",  name: "Central Japan Railway Company", jaName: "JR東海",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "4543.T",  name: "Terumo Corporation",            jaName: "テルモ",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "6594.T",  name: "Nidec Corporation",             jaName: "ニデック（日本電産）",   type: "Common Stock", exchange: "TSE" },
  { symbol: "4568.T",  name: "Daiichi Sankyo Co., Ltd.",      jaName: "第一三共",               type: "Common Stock", exchange: "TSE" },
  { symbol: "6971.T",  name: "Kyocera Corporation",           jaName: "京セラ",                 type: "Common Stock", exchange: "TSE" },
  { symbol: "4307.T",  name: "Nomura Research Institute",     jaName: "野村総合研究所",         type: "Common Stock", exchange: "TSE" },
  { symbol: "8725.T",  name: "MS&AD Insurance Group",         jaName: "MS＆ADインシュアランス", type: "Common Stock", exchange: "TSE" },
];

// フォールバック用の主要銘柄リスト（APIキーなし時に使用）
const FALLBACK_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "BRK/B", name: "Berkshire Hathaway Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "JNJ", name: "Johnson & Johnson", type: "Common Stock", exchange: "NYSE" },
  { symbol: "WMT", name: "Walmart Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "PG", name: "Procter & Gamble Co.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "MA", name: "Mastercard Incorporated", type: "Common Stock", exchange: "NYSE" },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "HD", name: "The Home Depot Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "BAC", name: "Bank of America Corporation", type: "Common Stock", exchange: "NYSE" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", type: "Common Stock", exchange: "NYSE" },
  { symbol: "PFE", name: "Pfizer Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "ABBV", name: "AbbVie Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "KO", name: "The Coca-Cola Company", type: "Common Stock", exchange: "NYSE" },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "PEP", name: "PepsiCo Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "COST", name: "Costco Wholesale Corporation", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "TMO", name: "Thermo Fisher Scientific Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "MRK", name: "Merck & Co. Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "CSCO", name: "Cisco Systems Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "ACN", name: "Accenture plc", type: "Common Stock", exchange: "NYSE" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "ORCL", name: "Oracle Corporation", type: "Common Stock", exchange: "NYSE" },
  { symbol: "ADBE", name: "Adobe Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "CRM", name: "Salesforce Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "INTC", name: "Intel Corporation", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "IBM", name: "International Business Machines", type: "Common Stock", exchange: "NYSE" },
  { symbol: "QCOM", name: "Qualcomm Incorporated", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "TXN", name: "Texas Instruments Incorporated", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "NOW", name: "ServiceNow Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "UBER", name: "Uber Technologies Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "SHOP", name: "Shopify Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "SPOT", name: "Spotify Technology S.A.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "SQ", name: "Block Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "SNAP", name: "Snap Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "COIN", name: "Coinbase Global Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", type: "Common Stock", exchange: "NYSE" },
  { symbol: "ARM", name: "Arm Holdings plc", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "SMCI", name: "Super Micro Computer Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "PANW", name: "Palo Alto Networks Inc.", type: "Common Stock", exchange: "NASDAQ" },
  { symbol: "CRWD", name: "CrowdStrike Holdings Inc.", type: "Common Stock", exchange: "NASDAQ" },
  // 日本株（NYSE/NASDAQ上場ADR）
  { symbol: "TM", name: "Toyota Motor Corporation", type: "Common Stock", exchange: "NYSE" },
  { symbol: "SONY", name: "Sony Group Corporation", type: "Common Stock", exchange: "NYSE" },
  { symbol: "HMC", name: "Honda Motor Co. Ltd.", type: "Common Stock", exchange: "NYSE" },
  // FX
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", type: "Physical Currency", exchange: "Forex" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", type: "Physical Currency", exchange: "Forex" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", type: "Physical Currency", exchange: "Forex" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", type: "Physical Currency", exchange: "Forex" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", type: "Physical Currency", exchange: "Forex" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", type: "Physical Currency", exchange: "Forex" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", type: "Physical Currency", exchange: "Forex" },
  { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", type: "Physical Currency", exchange: "Forex" },
  // 暗号資産
  { symbol: "BTC/USD", name: "Bitcoin / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "ETH/USD", name: "Ethereum / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "SOL/USD", name: "Solana / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "XRP/USD", name: "XRP / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "DOGE/USD", name: "Dogecoin / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "ADA/USD", name: "Cardano / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "AVAX/USD", name: "Avalanche / US Dollar", type: "Digital Currency", exchange: "Crypto" },
  { symbol: "LINK/USD", name: "Chainlink / US Dollar", type: "Digital Currency", exchange: "Crypto" },
];

function mapType(rawType: string): "stock" | "forex" | "crypto" | "etf" {
  const t = rawType.toLowerCase();
  if (t.includes("currency") && t.includes("digital")) return "crypto";
  if (t.includes("currency") || t.includes("forex")) return "forex";
  if (t.includes("etf") || t.includes("fund")) return "etf";
  return "stock";
}

/** クエリに日本語が含まれるか */
function isJapanese(text: string): boolean {
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const filter = request.nextUrl.searchParams.get("type") || "all";

  if (!query.trim()) {
    // クエリなし → デフォルト表示（米国主要株 + 日本株を混在）
    const jpDefault = JP_STOCKS.slice(0, 10).map((s) => ({
      symbol: s.symbol, name: s.name, jaName: s.jaName, type: mapType(s.type), exchange: s.exchange,
    }));
    const usDefault = FALLBACK_SYMBOLS
      .filter((s) => filter === "all" || mapType(s.type) === filter)
      .slice(0, 20)
      .map((s) => ({ symbol: s.symbol, name: s.name, type: mapType(s.type), exchange: s.exchange }));

    if (filter === "stock" || filter === "all") {
      return NextResponse.json([...jpDefault, ...usDefault].slice(0, 30));
    }
    return NextResponse.json(usDefault.slice(0, 30));
  }

  // ── Yahoo Finance API 検索（日本語/英語両対応）──
  if (isFinnhubConfigured()) {
    try {
      const raw = await searchSymbols(query);
      const data = raw as Record<string, unknown> | null;
      if (data?.data && Array.isArray(data.data)) {
        type TwelveItem = { symbol: string; instrument_name: string; instrument_type: string; exchange: string; country?: string };
        let results = (data.data as TwelveItem[]).map((item) => ({
          symbol: item.symbol,
          name: item.instrument_name,
          type: mapType(item.instrument_type),
          exchange: item.exchange,
          country: item.country || "",
        }));
        if (filter !== "all") {
          results = results.filter((r) => r.type === filter);
        }
        if (results.length > 0) return NextResponse.json(results.slice(0, 30));
      }
    } catch {
      // APIエラー時はフォールバックへ
    }
  }

  // ── フォールバック: ローカルリストからあいまい検索（日本語名対応）──
  const q = query.toLowerCase();
  const jpFiltered = JP_STOCKS.filter((s) => {
    if (filter !== "all" && mapType(s.type) !== filter) return false;
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.jaName.includes(query) // 日本語名でもマッチ
    );
  }).map((s) => ({ symbol: s.symbol, name: s.name, jaName: s.jaName, type: mapType(s.type), exchange: s.exchange }));

  const usFiltered = FALLBACK_SYMBOLS.filter((s) => {
    const matchQuery = s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    return matchQuery && (filter === "all" || mapType(s.type) === filter);
  }).map((s) => ({ symbol: s.symbol, name: s.name, type: mapType(s.type), exchange: s.exchange }));

  // 日本語クエリなら日本株を先頭に
  const combined = isJapanese(query)
    ? [...jpFiltered, ...usFiltered]
    : [...usFiltered, ...jpFiltered];

  return NextResponse.json(combined.slice(0, 30));
}
