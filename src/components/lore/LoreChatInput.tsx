"use client";
import { useState, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface LoreChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function LoreChatInput({ onSend, disabled }: LoreChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="p-4 flex gap-2 items-end shrink-0"
      style={{ borderTop: "1px solid var(--grove-border)" }}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={() => {
          const el = textareaRef.current;
          if (el) {
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }
        }}
        placeholder="Ask Lore anything..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-md px-3 py-2.5 text-sm focus:outline-none disabled:opacity-40"
        style={{
          background: "var(--grove-surface-2)",
          border: "1px solid var(--grove-border)",
          color: "var(--grove-text)",
          caretColor: "var(--grove-accent)",
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="shrink-0 rounded-md p-2.5 transition-all disabled:opacity-30"
        style={{
          background: "var(--grove-accent-dim)",
          border: "1px solid var(--grove-accent-border)",
          color: "var(--grove-accent)",
        }}
        onMouseEnter={e => {
          if (!disabled && message.trim())
            (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)";
        }}
      >
        <Send size={15} />
      </button>
    </div>
  );
}
