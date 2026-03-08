import { NextRequest } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `あなたはプロの投資・トレーディングアナリストアシスタントです。

## 回答の流れ（必ず守る）
1. 必ず最初に search_news ツールで関連ニュースを検索する。
2. 取得した記事の内容を日本語で整理し、読みやすいまとめ文を作成する。
3. 末尾に「※投資判断はご自身の責任で行ってください。」を付ける。

## まとめ文のルール

### 書いてよいこと
- 取得したニュース記事に書かれている事実の要約
- 記事中でアナリスト・専門家・企業が述べている見解や発言の紹介（「〇〇氏は〜と述べています」「〇〇社は〜と発表しました」など、発言者を明示する）
- 複数記事の共通テーマや全体的な論調のまとめ（「各メディアは〜と報じています」）

### 将来予測を求められた場合（「どうなる？」「今後は？」「予想して」など）
- 取得したニュース記事の内容を根拠として、「直近のニュースから〜になるかと予想します」という形で予想を述べてよい。
- 予想を述べた回答の末尾には必ず「※あくまで予想です。投資は自己責任でお願いします。」を付ける。
- 記事の裏付けなしに、自分の学習データだけで予測することは禁止。

### 書いてはいけないこと
- 取得したニュース記事の裏付けなしに、自分の学習データや一般知識のみに基づいた情報・予測

### ニュースが0件だった場合
「現時点では該当するニュースが見つかりませんでした。」とだけ伝え、それ以上の補足は加えない。

## チャートツール（ニュース検索後に必要な場合のみ使用）
- draw_chart_annotation: チャートにライン・マーカーを描画
- set_alert: 価格アラートを設定
- manage_watchlist: ウォッチリストの管理

## 言語
- 必ず日本語で回答する`;

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_news",
      description: "最新の投資・マーケットニュースを検索する。必ずユーザーの質問に答える前に呼び出すこと。銘柄コードがある場合はそれを指定する。",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "特定銘柄のニュースを取得する場合の銘柄コード（例: AAPL, BTC, USD/JPY）。省略するとマーケット全般のニュースを取得する。",
          },
          category: {
            type: "string",
            enum: ["general", "forex", "crypto", "merger"],
            description: "symbol未指定時のニュースカテゴリ。general=全般, forex=為替, crypto=暗号資産, merger=合併・買収",
          },
          keywords: {
            type: "string",
            description: "絞り込みたいキーワード（日本語可）。例: '利上げ', '決算', 'FOMC'",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_chart_annotation",
      description: "チャートにアノテーション（水平ライン、マーカー）を描画する。ニュース検索後にサポート・レジスタンスライン等を示す場合に使う。",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["horizontal_line", "marker", "clear"],
            description: "アノテーションの種類",
          },
          params: {
            type: "object",
            properties: {
              price: { type: "number", description: "水平ラインの価格" },
              color: { type: "string", description: "色（例: #FF0000）" },
              label: { type: "string", description: "ラベル（例: サポート, レジスタンス）" },
              time: { type: "number", description: "マーカーのUNIXタイムスタンプ" },
              text: { type: "string", description: "マーカーのテキスト" },
              position: {
                type: "string",
                enum: ["aboveBar", "belowBar", "inBar"],
              },
              shape: {
                type: "string",
                enum: ["circle", "square", "arrowUp", "arrowDown"],
              },
            },
          },
        },
        required: ["type", "params"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_alert",
      description: "価格アラートを設定する",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          condition: { type: "string", enum: ["above", "below"] },
          price: { type: "number" },
          message: { type: "string" },
        },
        required: ["symbol", "condition", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_watchlist",
      description: "ウォッチリストの銘柄を追加・削除する",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "remove"] },
          symbol: { type: "string" },
          name: { type: "string" },
          type: { type: "string", enum: ["stock", "forex", "crypto", "etf"] },
        },
        required: ["action", "symbol"],
      },
    },
  },
];

// 暗号資産のシンボル → 英語キーワードのマッピング
const CRYPTO_MAP: Record<string, string> = {
  BTC: "bitcoin", BITCOIN: "bitcoin",
  ETH: "ethereum", ETHEREUM: "ethereum",
  XRP: "xrp", RIPPLE: "ripple",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "polygon",
  AVAX: "avalanche",
  DOT: "polkadot",
  LTC: "litecoin",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  NEAR: "near protocol",
};

// Finnhub からニュースを取得
async function fetchNews(params: {
  symbol?: string;
  category?: string;
  keywords?: string;
}) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const today = new Date();
  const from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = today.toISOString().split("T")[0];

  let url: string;
  let autoKeyword: string | undefined;

  if (params.symbol) {
    const upperSymbol = params.symbol.toUpperCase();
    // 暗号資産かどうか判定（例: BTC, BTC/USD, BTCUSD, ETH など）
    const cryptoEntry = Object.entries(CRYPTO_MAP).find(([k]) =>
      upperSymbol.includes(k)
    );

    if (cryptoEntry) {
      // 暗号資産 → crypto カテゴリのニュースエンドポイントを使用
      url = `https://finnhub.io/api/v1/news?category=crypto&token=${apiKey}`;
      // キーワード未指定なら銘柄名で自動フィルタ
      if (!params.keywords) autoKeyword = cryptoEntry[1];
    } else {
      // 株式・ETF → company-news エンドポイント
      const cleanSymbol = params.symbol.replace(/[^A-Z0-9.]/gi, "").toUpperCase();
      url = `https://finnhub.io/api/v1/company-news?symbol=${cleanSymbol}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
    }
  } else {
    // シンボル未指定 → カテゴリ別マーケットニュース
    const category = params.category ?? "general";
    url = `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`;
  }

  let res: Response;
  try {
    // no-store でキャッシュせず毎回最新を取得
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error("[fetchNews] fetch error:", err);
    return [];
  }
  if (!res.ok) {
    console.error("[fetchNews] HTTP error:", res.status, await res.text().catch(() => ""));
    return [];
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    console.error("[fetchNews] JSON parse error:", err);
    return [];
  }
  if (!Array.isArray(data)) return [];

  // キーワードフィルタ
  let articles = data as {
    headline: string;
    url: string;
    source: string;
    datetime: number;
    summary?: string;
  }[];

  // キーワードフィルタ（明示指定 or 暗号資産の自動キーワード）
  const keyword = params.keywords ?? autoKeyword;
  if (keyword) {
    const kw = keyword.toLowerCase();
    articles = articles.filter(
      (a) =>
        a.headline?.toLowerCase().includes(kw) ||
        a.summary?.toLowerCase().includes(kw)
    );
  }

  // 最新10件に絞る
  return articles
    .filter((a) => a.url && a.headline)
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 10)
    .map((a) => ({
      headline: a.headline,
      url: a.url,
      source: a.source ?? "不明",
      datetime: a.datetime,
      summary: a.summary ?? "",
    }));
}

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const body = await request.json();
  const { message, history = [], chartContext } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((h: { role: string; content: string }) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          {
            role: "user",
            content: chartContext
              ? `[チャートコンテキスト]\n銘柄: ${chartContext.symbol}\n時間軸: ${chartContext.timeframe}\n現在価格: ${chartContext.currentPrice}\n変動率: ${chartContext.changePercent?.toFixed(2)}%\n\n[ユーザーの質問]\n${message}`
              : message,
          },
        ];

        let continueLoop = true;
        let firstIteration = true; // 初回は必ず search_news を実行

        while (continueLoop) {
          const toolCallsMap = new Map<
            number,
            { id: string; name: string; arguments: string }
          >();
          let assistantContent = "";
          let finishReason = "";

          // 初回ループ: search_news を強制。2回目以降: auto（チャート操作等を許可）
          const toolChoice: OpenAI.Chat.ChatCompletionToolChoiceOption = firstIteration
            ? { type: "function", function: { name: "search_news" } }
            : "auto";
          firstIteration = false;

          const streamResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 4096,
            tools: TOOLS,
            tool_choice: toolChoice,
            messages,
            stream: true,
          });

          for await (const chunk of streamResponse) {
            const choice = chunk.choices[0];
            if (!choice) continue;

            if (choice.finish_reason) finishReason = choice.finish_reason;

            const delta = choice.delta;

            if (delta.content) {
              assistantContent += delta.content;
              send({ type: "text", content: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCallsMap.has(idx)) {
                  toolCallsMap.set(idx, { id: "", name: "", arguments: "" });
                }
                const existing = toolCallsMap.get(idx)!;
                if (tc.id) existing.id += tc.id;
                if (tc.function?.name) existing.name += tc.function.name;
                if (tc.function?.arguments) existing.arguments += tc.function.arguments;
              }
            }
          }

          // tool_choice で特定関数を強制した場合 finishReason は "stop" になるため
          // toolCallsMap にエントリがあればツール実行（finish_reason に依存しない）
          if (toolCallsMap.size > 0) {
            const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] =
              Array.from(toolCallsMap.values()).map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.arguments },
              }));

            messages.push({
              role: "assistant",
              content: assistantContent || null,
              tool_calls: toolCalls,
            });

            const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

            for (const tc of toolCalls) {
              let result: object = {};
              let input: Record<string, string> = {};

              try {
                input = JSON.parse(tc.function.arguments);
              } catch {
                input = {};
              }

              if (tc.function.name === "search_news") {
                const articles = await fetchNews({
                  symbol: input.symbol,
                  category: input.category,
                  keywords: input.keywords,
                });

                result = { articles };
                // フロントエンドにソース情報を送信
                send({ type: "sources", sources: articles });
              } else if (tc.function.name === "draw_chart_annotation") {
                result = {
                  success: true,
                  action: { type: input.type, params: input.params },
                };
                send({ type: "tool_result", tool: tc.function.name, result });
              } else if (tc.function.name === "set_alert") {
                try {
                  const res = await fetch(
                    `${request.nextUrl.origin}/api/alerts`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(input),
                    }
                  );
                  result = res.ok
                    ? { success: true, alert: await res.json() }
                    : {
                        success: true,
                        alert: {
                          id: Date.now().toString(),
                          ...input,
                          isActive: true,
                          createdAt: new Date().toISOString(),
                        },
                      };
                } catch {
                  result = {
                    success: true,
                    alert: {
                      id: Date.now().toString(),
                      ...input,
                      isActive: true,
                      createdAt: new Date().toISOString(),
                    },
                  };
                }
                send({ type: "tool_result", tool: tc.function.name, result });
              } else if (tc.function.name === "manage_watchlist") {
                result = { success: true };
                send({ type: "tool_result", tool: tc.function.name, result });
              }

              toolResults.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }

            messages.push(...toolResults);
          } else {
            continueLoop = false;
          }
        }

        send({ type: "done" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", message: errMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
