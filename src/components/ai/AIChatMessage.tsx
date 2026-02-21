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
      el.classList.add("ring-2", "ring-blue-400");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-blue-400");
      }, 2000);
    }
  };

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "p-3 rounded-lg max-w-[80%] text-sm",
          isUser ? "bg-blue-50 text-gray-900" : "bg-gray-100 text-gray-900"
        )}
      >
        <div
          className={cn(
            "text-xs font-medium mb-1",
            isUser ? "text-blue-600" : "text-gray-500"
          )}
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
                className="text-xs bg-white/80 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors"
              >
                Block ref
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
