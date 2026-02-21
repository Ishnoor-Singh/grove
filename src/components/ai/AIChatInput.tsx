"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface AIChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function AIChatInput({ onSend, disabled }: AIChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  return (
    <div
      className="p-3 flex gap-2 items-end shrink-0"
      style={{ borderTop: "1px solid var(--grove-border)" }}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Ask about this note..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-md px-3 py-2 text-xs focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: "var(--grove-surface-2)",
          border: "1px solid var(--grove-border)",
          color: "var(--grove-text)",
          fontFamily: "var(--font-geist-mono)",
          caretColor: "var(--grove-accent)",
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="shrink-0 rounded-md p-2 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: "var(--grove-accent-dim)",
          border: "1px solid var(--grove-accent-border)",
          color: "var(--grove-accent)",
        }}
        onMouseEnter={e => {
          if (!disabled && message.trim()) {
            (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)";
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)";
        }}
      >
        <Send size={13} />
      </button>
    </div>
  );
}
