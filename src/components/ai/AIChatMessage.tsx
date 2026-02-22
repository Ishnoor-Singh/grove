"use client";

import { cn } from "@/lib/utils";

interface AIChatMessageProps {
  role: "user" | "assistant";
  content: string;
  blockReferences?: string[];
}

export default function AIChatMessage({
  role,
  content,
  blockReferences,
}: AIChatMessageProps) {
  const isUser = role === "user";

  const scrollToBlock = (blockId: string) => {
    const el = document.querySelector(`[data-id="${blockId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).style.outline = "2px solid rgba(137, 180, 255, 0.4)";
      (el as HTMLElement).style.outlineOffset = "4px";
      setTimeout(() => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
      }, 2000);
    }
  };

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className="p-3 rounded-lg max-w-[85%] text-xs leading-relaxed"
        style={
          isUser
            ? {
                background: "var(--grove-surface-3)",
                border: "1px solid var(--grove-border-2)",
                color: "var(--grove-text)",
              }
            : {
                background: "var(--grove-surface-2)",
                border: "1px solid var(--grove-border)",
                color: "var(--grove-text)",
              }
        }
      >
        <div
          className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5"
          style={{
            color: isUser ? "var(--grove-text-2)" : "var(--grove-accent)",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          {isUser ? "You" : "Grove AI"}
        </div>

        <div className="whitespace-pre-wrap">{content}</div>

        {blockReferences && blockReferences.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {blockReferences.map((blockId) => (
              <button
                key={blockId}
                onClick={() => scrollToBlock(blockId)}
                className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                style={{
                  background: "var(--grove-accent-dim)",
                  border: "1px solid var(--grove-accent-border)",
                  color: "var(--grove-accent)",
                  fontFamily: "var(--font-geist-mono)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)";
                }}
              >
                ↗ block
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
