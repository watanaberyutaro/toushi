"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, ChevronUp } from "lucide-react";
import clsx from "clsx";

const QUICK_PROMPTS = [
  "サポートラインを描画して",
  "現在のトレンドを分析して",
  "RSIが70を超えたらアラートを設定して",
  "このチャートのまとめを教えて",
];

interface Props {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: Props) {
  const [text, setText] = useState("");
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false); // IME 変換中フラグ

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSend(text.trim());
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // IME 変換確定中の Enter は送信しない
      if (isComposingRef.current) return;
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="p-3">
      {/* Quick prompts */}
      {showQuickPrompts && (
        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => {
                setText(prompt);
                setShowQuickPrompts(false);
                textareaRef.current?.focus();
              }}
              className="text-xs px-2 py-1 bg-bg-tertiary border border-border rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Quick prompt toggle */}
        <button
          onClick={() => setShowQuickPrompts(!showQuickPrompts)}
          className={clsx(
            "p-2 rounded transition-colors flex-none mb-0.5",
            showQuickPrompts ? "bg-accent-blue/20 text-accent-blue" : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
          )}
          title="クイックプロンプト"
        >
          <ChevronUp size={14} className={clsx("transition-transform", showQuickPrompts ? "rotate-180" : "")} />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; }}
            onInput={handleInput}
            placeholder="AIアナリストに質問する..."
            disabled={isLoading}
            rows={1}
            className={clsx(
              "w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none transition-colors",
              isLoading ? "opacity-60 cursor-not-allowed" : "focus:border-accent-blue hover:border-border-light"
            )}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className={clsx(
            "p-2.5 rounded-lg transition-all flex-none mb-0.5",
            text.trim() && !isLoading
              ? "bg-accent-blue hover:bg-blue-700 text-white shadow-lg shadow-accent-blue/20"
              : "bg-bg-tertiary text-text-muted cursor-not-allowed"
          )}
        >
          <Send size={14} />
        </button>
      </div>

      <p className="text-xs text-text-muted mt-1.5 text-center">
        Enter で送信・Shift+Enter で改行 ／ チャートコンテキストは自動送信されます
      </p>
    </div>
  );
}
