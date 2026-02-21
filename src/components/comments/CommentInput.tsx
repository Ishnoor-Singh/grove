"use client";
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface CommentInputProps {
  onSubmit: (body: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentInput({
  onSubmit,
  placeholder = "Write a comment...",
  autoFocus = false,
}: CommentInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="flex items-end gap-1.5 rounded-md p-2"
      style={{
        background: "var(--grove-surface-2)",
        border: "1px solid var(--grove-border)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-xs outline-none min-h-[28px] max-h-[100px]"
        style={{
          color: "var(--grove-text)",
          caretColor: "var(--grove-accent)",
          fontFamily: "inherit",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="shrink-0 p-1.5 rounded transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: "var(--grove-text-3)" }}
        onMouseEnter={e => {
          if (value.trim()) (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
        }}
      >
        <Send size={12} />
      </button>
    </div>
  );
}
