"use client";

import { ChatMessage as ChatMessageType } from "@/types";
import { Bot, User, TrendingUp, Bell, List, ExternalLink, Newspaper } from "lucide-react";
import clsx from "clsx";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isAssistant = message.role === "assistant";

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold
      let rendered = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Italic
      rendered = rendered.replace(/\*(.*?)\*/g, "<em>$1</em>");
      // Code
      rendered = rendered.replace(/`(.*?)`/g, '<code class="bg-bg-tertiary px-1 rounded text-accent-blue font-mono text-xs">$1</code>');

      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-sm font-bold text-text-primary mt-2 mb-1" dangerouslySetInnerHTML={{ __html: rendered.slice(4) }} />;
      }
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-sm font-bold text-text-primary mt-2 mb-1" dangerouslySetInnerHTML={{ __html: rendered.slice(3) }} />;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return <li key={i} className="text-xs text-text-primary ml-3 list-disc" dangerouslySetInnerHTML={{ __html: rendered.slice(2) }} />;
      }
      if (line === "") {
        return <br key={i} />;
      }
      return <p key={i} className="text-xs text-text-primary leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />;
    });
  };

  return (
    <div className={clsx("flex gap-3", isAssistant ? "flex-row" : "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={clsx(
          "w-7 h-7 rounded-full flex items-center justify-center flex-none mt-0.5",
          isAssistant ? "bg-accent-blue/20" : "bg-bg-tertiary"
        )}
      >
        {isAssistant ? (
          <Bot size={13} className="text-accent-blue" />
        ) : (
          <User size={13} className="text-text-secondary" />
        )}
      </div>

      {/* Content */}
      <div
        className={clsx(
          "max-w-[85%] rounded-lg px-3 py-2.5",
          isAssistant
            ? "bg-bg-card border border-border"
            : "bg-accent-blue/15 border border-accent-blue/30"
        )}
      >
        {/* Message text */}
        <div className="space-y-0.5">
          {renderContent(message.content)}
          {message.content === "" && (
            <span className="cursor-blink text-xs text-text-muted" />
          )}
        </div>

        {/* Chart actions indicator */}
        {message.chartActions && message.chartActions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-accent-green">
              <TrendingUp size={11} />
              <span>チャートに {message.chartActions.length} 個のアノテーションを追加</span>
            </div>
          </div>
        )}

        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1">
            {message.toolCalls.map((tc, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                {tc.name === "set_alert" && <Bell size={10} />}
                {tc.name === "manage_watchlist" && <List size={10} />}
                <span className="font-mono">
                  {tc.name === "set_alert" ? "アラートを設定" : tc.name === "manage_watchlist" ? "ウォッチリストを更新" : tc.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* News sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
              <Newspaper size={11} />
              <span className="font-semibold">情報ソース</span>
            </div>
            <ul className="space-y-1.5">
              {message.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                  >
                    <ExternalLink size={10} className="flex-none mt-0.5 opacity-70 group-hover:opacity-100" />
                    <span className="leading-snug underline underline-offset-2 decoration-accent-blue/40 group-hover:decoration-accent-blue">
                      {s.headline}
                    </span>
                  </a>
                  <div className="ml-4 flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-text-muted font-mono">{s.source}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {new Date(s.datetime * 1000).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp（エポック時刻=ウェルカムメッセージは非表示） */}
        {message.timestamp.getTime() > 0 && (
          <div className="mt-1.5">
            <span className="text-xs text-text-muted font-mono">
              {message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
