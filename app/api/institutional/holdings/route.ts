import { NextRequest, NextResponse } from "next/server";

export interface Institution {
  id: string;
  name: string;
  cik: string;
  manager: string;
  style: string;
  description: string;
  focus: string[];
}

// SEC EDGAR 13F institutions list
const INSTITUTIONS: Institution[] = [
  {
    id: "berkshire",
    name: "Berkshire Hathaway",
    cik: "0001067983",
    manager: "Warren Buffett",
    style: "バリュー投資",
    description:
      "「投資の神様」ウォーレン・バフェットが率いる世界最大級の投資持株会社。長期保有を基本とし、「理解できるビジネス」「競争優位性（経済的な堀）」「適正な価格」の3条件を満たす企業に集中投資する。数十年単位の保有期間が特徴で、短期の株価変動に動じない超長期投資家。",
    focus: ["金融・保険", "消費財", "エネルギー", "鉄道"],
  },
  {
    id: "pershing",
    name: "Pershing Square Capital",
    cik: "0001336528",
    manager: "Bill Ackman",
    style: "アクティビスト",
    description:
      "ビル・アックマンが率いる、数少ない銘柄に大量資金を投入する集中型アクティビスト運用会社。投資先の経営改革や株主還元の強化を積極的に求め、企業価値向上を目指す。少数の厳選銘柄に絞った「コンビクション」投資が哲学の核。",
    focus: ["小売", "飲食・ブランド", "不動産", "金融"],
  },
  {
    id: "bridgewater",
    name: "Bridgewater Associates",
    cik: "0001350694",
    manager: "Ray Dalio",
    style: "マクロ",
    description:
      "レイ・ダリオが創設した世界最大のヘッジファンド。マクロ経済の大局観に基づき、株式・債券・コモディティ・通貨など複数資産クラスに分散投資する「オール・ウェザー」戦略が有名。景気サイクルとリスクパリティの概念を投資に取り入れた先駆者。",
    focus: ["ETF・インデックス", "新興国", "コモディティ", "債券"],
  },
  {
    id: "appaloosa",
    name: "Appaloosa Management",
    cik: "0000827054",
    manager: "David Tepper",
    style: "ディストレスト",
    description:
      "デイビッド・テッパーが率いる、不況・危機局面での逆張り投資を得意とするヘッジファンド。経営難や市場パニックで割安になった株式・債券への大胆な投資で知られ、2009年の金融危機後に莫大なリターンを上げた。景気に対して強気な見方が多い。",
    focus: ["金融", "テクノロジー", "景気循環株", "危機銘柄"],
  },
  {
    id: "third-point",
    name: "Third Point",
    cik: "0001418538",
    manager: "Dan Loeb",
    style: "アクティビスト",
    description:
      "ダン・ローブが率いる著名アクティビストファンド。投資先企業へ公開書簡を送付し経営陣の交代や事業改革を要求することで知られる。バリュー投資とアクティビズムを組み合わせ、テクノロジー・ヘルスケアなど成長セクターにも積極投資する。",
    focus: ["テクノロジー", "ヘルスケア", "消費財", "金融"],
  },
  {
    id: "tiger-global",
    name: "Tiger Global Management",
    cik: "0001530965",
    manager: "Chase Coleman",
    style: "テック特化",
    description:
      "チェース・コールマンが率いる、テクノロジー・インターネット分野に特化した投資ファンド。上場株式だけでなくベンチャー企業への未公開株投資も行い、Spotifyや中国インターネット企業など世界のテック企業に幅広く投資してきた。",
    focus: ["ソフトウェア", "EC・プラットフォーム", "フィンテック", "新興国テック"],
  },
  {
    id: "coatue",
    name: "Coatue Management",
    cik: "0001336702",
    manager: "Philippe Laffont",
    style: "テック特化",
    description:
      "フィリップ・ラフォンが率いる、テクノロジー株に集中した長・短両建て（ロング・ショート）ヘッジファンド。データ分析とテクノロジーの長期トレンドへの深い理解を投資判断の基盤とし、AI・クラウド・半導体分野の大型テック株を中心に保有する。",
    focus: ["半導体", "クラウド・AI", "ソフトウェア", "プラットフォーム"],
  },
  {
    id: "duquesne",
    name: "Duquesne Family Office",
    cik: "0001418223",
    manager: "Stanley Druckenmiller",
    style: "マクロ",
    description:
      "スタンレー・ドラッケンミラーが率いる、マクロ経済分析を軸にした投資ファミリーオフィス。ジョージ・ソロスとの共同作業でポンド危機を引き起こした「イングランド銀行を破った男」として知られる。金融政策・マクロトレンドに対する高い洞察と大胆なポジション変更が特徴。",
    focus: ["テクノロジー", "医薬品", "エネルギー", "マクロヘッジ"],
  },
];

interface Holding {
  name: string;
  cusip: string;
  value: number;
  shares: number;
}

function parseInfoTable(xml: string): Holding[] {
  const holdings: Holding[] = [];
  const regex = /<infoTable>([\s\S]*?)<\/infoTable>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1];
    const name = block.match(/<nameOfIssuer>(.*?)<\/nameOfIssuer>/i)?.[1]?.trim() ?? "";
    const cusip = block.match(/<cusip>(.*?)<\/cusip>/i)?.[1]?.trim() ?? "";
    const value = parseInt(
      block.match(/<value>(.*?)<\/value>/i)?.[1]?.replace(/,/g, "")?.trim() ?? "0",
      10
    );
    const shares = parseInt(
      block.match(/<sshPrnamt>(.*?)<\/sshPrnamt>/i)?.[1]?.trim() ?? "0",
      10
    );
    if (name) holdings.push({ name, cusip, value, shares });
  }
  return holdings;
}

async function fetchLatest13F(
  cik: string
): Promise<{ holdings: Holding[]; reportDate: string; period: string } | null> {
  const cikNum = cik.replace(/^0+/, "");
  const paddedCik = cik.padStart(10, "0");

  const subRes = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
    headers: { "User-Agent": "AI-Trading-Assistant contact@example.com" },
    cache: "no-store",
  });
  if (!subRes.ok) return null;
  const sub = await subRes.json();

  const types: string[] = sub.filings?.recent?.form ?? [];
  const accNums: string[] = sub.filings?.recent?.accessionNumber ?? [];
  const reportDates: string[] = sub.filings?.recent?.reportDate ?? [];
  const filedDates: string[] = sub.filings?.recent?.filingDate ?? [];

  const idx = types.findIndex((t) => t === "13F-HR" || t === "13F-HR/A");
  if (idx === -1) return null;

  const accession = accNums[idx];
  const reportDate = reportDates[idx] ?? filedDates[idx] ?? "";
  const accNoSlashes = accession.replace(/-/g, "");

  const indexRes = await fetch(
    `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoSlashes}/index.json`,
    { headers: { "User-Agent": "AI-Trading-Assistant contact@example.com" }, cache: "no-store" }
  );
  if (!indexRes.ok) return null;
  const index = await indexRes.json();

  const files: { name: string; type: string }[] = index.directory?.item ?? [];
  const infoFile = files.find(
    (f) =>
      f.name.endsWith(".xml") &&
      f.name !== "primary_doc.xml" &&
      !f.name.toLowerCase().includes("index")
  );
  if (!infoFile) return null;

  const xmlRes = await fetch(
    `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoSlashes}/${infoFile.name}`,
    { headers: { "User-Agent": "AI-Trading-Assistant contact@example.com" }, cache: "no-store" }
  );
  if (!xmlRes.ok) return null;
  const xml = await xmlRes.text();

  const holdings = parseInfoTable(xml)
    .sort((a, b) => b.value - a.value)
    .slice(0, 30);

  return { holdings, reportDate, period: reportDate.slice(0, 7) };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      INSTITUTIONS.map(({ id, name, manager, style, description, focus }) => ({
        id,
        name,
        manager,
        style,
        description,
        focus,
      }))
    );
  }

  const inst = INSTITUTIONS.find((i) => i.id === id);
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await fetchLatest13F(inst.cik);
    if (!result) return NextResponse.json({ holdings: [], reportDate: "", period: "" });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ holdings: [], reportDate: "", period: "" });
  }
}
