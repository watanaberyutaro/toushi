"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { ChatMessage as ChatMessageType, ChartAction, NewsSource } from "@/types";
import { Bot, Trash2 } from "lucide-react";

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const WELCOME_CONTENT = `こんにちは！GPT-4o搭載の投資アナリストアシスタントです。

現在表示中のチャートについて、以下のことをお手伝いできます：

- **買い・売り判断** - エントリーポイント、利確・損切りラインを具体的な価格で提案
- **テクニカル分析** - RSI・MACD・移動平均などを総合的に評価
- **チャートアノテーション** - サポート/レジスタンスラインをチャートに直接描画
- **アラート設定** - 指定価格に達したときの通知を設定
- **銘柄管理** - ウォッチリストへの追加・削除

例: 「今のAAPLは買い？売り？」
例: 「サポートラインとレジスタンスラインを引いて」
例: 「RSI・MACDを使ってトレンドを分析して」
例: 「損切りラインと利確ラインを設定して」`;

const WELCOME_MESSAGE: ChatMessageType = {
  id: "welcome",
  role: "assistant",
  content: WELCOME_CONTENT,
  timestamp: new Date(0),
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chartContext, addChartAction, alerts, setAlerts, watchlist, setWatchlist } = useAppStore();

  // Supabase からチャット履歴を復元
  useEffect(() => {
    fetch("/api/chat-history")
      .then((r) => r.json())
      .then((data: { id: string; role: string; content: string; sources?: NewsSource[]; chartActions?: ChartAction[]; timestamp: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const restored: ChatMessageType[] = data.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            sources: m.sources,
            chartActions: m.chartActions,
            timestamp: new Date(m.timestamp),
          }));
          setMessages([WELCOME_MESSAGE, ...restored]);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // メッセージ保存（ストリーミング完了後）
  const saveMessage = useCallback(async (msg: ChatMessageType) => {
    if (msg.id === "welcome") return;
    await fetch("/api/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: msg.role,
        content: msg.content,
        sources: msg.sources ?? [],
        chartActions: msg.chartActions ?? [],
      }),
    }).catch(() => {});
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = generateId();
    const assistantMessage: ChatMessageType = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      chartActions: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    let finalAssistant: ChatMessageType = assistantMessage;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, chartContext }),
      });

      if (!response.ok || !response.body) throw new Error("Chat API error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      const collectedActions: ChartAction[] = [];
      const collectedSources: NewsSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "text") {
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m)
                );
              } else if (parsed.type === "sources") {
                collectedSources.push(...(parsed.sources as NewsSource[]));
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, sources: [...collectedSources] } : m)
                );
              } else if (parsed.type === "tool_result") {
                const { tool, result } = parsed;
                if (tool === "draw_chart_annotation" && result?.action) {
                  collectedActions.push(result.action);
                  addChartAction(result.action);
                } else if (tool === "set_alert" && result?.alert) {
                  setAlerts([...alerts, result.alert]);
                } else if (tool === "manage_watchlist" && result?.watchlist) {
                  setWatchlist(result.watchlist);
                }
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, chartActions: collectedActions } : m)
                );
              }
            } catch {}
          }
        }
      }

      finalAssistant = {
        ...assistantMessage,
        content: fullContent,
        sources: collectedSources.length > 0 ? collectedSources : undefined,
        chartActions: collectedActions.length > 0 ? collectedActions : undefined,
      };
    } catch {
      finalAssistant = {
        ...assistantMessage,
        content: "申し訳ありません。エラーが発生しました。もう一度お試しください。",
      };
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? finalAssistant : m)
      );
    } finally {
      setIsLoading(false);
      // ストリーミング完了後にSupabaseへ保存
      if (hydrated) {
        saveMessage(userMessage);
        saveMessage(finalAssistant);
      }
    }
  }, [messages, isLoading, chartContext, addChartAction, alerts, setAlerts, watchlist, setWatchlist, hydrated, saveMessage]);

  const clearChat = async () => {
    setMessages([WELCOME_MESSAGE]);
    await fetch("/api/chat-history", { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center">
            <Bot size={13} className="text-accent-blue" />
          </div>
          <span className="text-sm font-semibold text-text-primary">AI Trading Assistant</span>
          <span className="text-xs px-1.5 py-0.5 bg-accent-green/20 text-accent-green rounded font-mono">
            GPT-4o
          </span>
        </div>
        <button
          onClick={clearChat}
          className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
          title="チャットをクリア"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-3 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>分析中...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-none border-t border-border">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
