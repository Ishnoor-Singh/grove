"use client";
import ToolCallInspector from "@/components/shared/ToolCallInspector";
import WebSearchCard from "./WebSearchCard";

interface LoreChatMessageProps {
  role: "user" | "assistant";
  content: string;
  thinkingContent?: string;
  toolCalls?: Array<{ toolName: string; input: any; output: any; durationMs?: number }>;
}

export default function LoreChatMessage({
  role,
  content,
  thinkingContent,
  toolCalls,
}: LoreChatMessageProps) {
  const isUser = role === "user";

  // Extract web search tool calls for rich rendering
  const webSearches = toolCalls?.filter((tc) => tc.toolName === "web_search" && tc.output?.results) ?? [];
  const otherToolCalls = toolCalls?.filter((tc) => tc.toolName !== "web_search") ?? [];
  const hasTrace = !!thinkingContent || otherToolCalls.length > 0;

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`${isUser ? "max-w-[85%]" : "w-full"}`}>
        {/* Tool call inspector (non-search tools) */}
        {!isUser && hasTrace && (
          <ToolCallInspector
            thinkingContent={thinkingContent}
            toolCalls={otherToolCalls}
          />
        )}

        {/* Web search cards */}
        {!isUser && webSearches.map((ws, i) => (
          <WebSearchCard
            key={i}
            query={ws.input?.query ?? ""}
            results={ws.output?.results ?? []}
          />
        ))}

        {/* Message bubble */}
        <div
          className="p-3 rounded-lg text-xs leading-relaxed"
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
            {isUser ? "You" : "Lore"}
          </div>
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}
