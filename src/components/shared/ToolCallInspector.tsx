"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown, Brain, Wrench } from "lucide-react";

interface ToolCall {
  toolName: string;
  input: any;
  output: any;
  durationMs?: number;
}

interface ToolCallInspectorProps {
  thinkingContent?: string;
  toolCalls?: ToolCall[];
}

export default function ToolCallInspector({
  thinkingContent,
  toolCalls,
}: ToolCallInspectorProps) {
  const [open, setOpen] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  const stepCount = (thinkingContent ? 1 : 0) + (toolCalls?.length ?? 0);
  if (stepCount === 0) return null;

  const totalMs = toolCalls?.reduce((s, t) => s + (t.durationMs ?? 0), 0) ?? 0;

  return (
    <div
      className="mb-2 rounded-md overflow-hidden"
      style={{ border: "1px solid var(--grove-border)", background: "var(--grove-surface-2)" }}
    >
      {/* Summary row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-3)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="text-[10px] tracking-[0.05em]">
          {stepCount} step{stepCount !== 1 ? "s" : ""}
          {totalMs > 0 && ` · ${(totalMs / 1000).toFixed(1)}s`}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1.5">
          {/* Thinking */}
          {thinkingContent && (
            <div>
              <button
                onClick={() => setExpandedThinking((e) => !e)}
                className="flex items-center gap-1.5 text-[10px] w-full text-left py-1"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                <Brain size={10} style={{ color: "var(--grove-accent)" }} />
                <span>thinking</span>
                {expandedThinking ? <ChevronDown size={9} /> : <span className="opacity-50">···</span>}
              </button>
              {expandedThinking && (
                <div
                  className="text-[10px] leading-relaxed p-2 rounded whitespace-pre-wrap"
                  style={{
                    background: "var(--grove-surface-3)",
                    color: "var(--grove-text-3)",
                    fontFamily: "var(--font-geist-mono)",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {thinkingContent}
                </div>
              )}
            </div>
          )}

          {/* Tool calls */}
          {toolCalls?.map((tc, i) => (
            <div key={i}>
              <button
                onClick={() =>
                  setExpandedTools((t) => ({ ...t, [i]: !t[i] }))
                }
                className="flex items-center gap-1.5 text-[10px] w-full text-left py-1"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                <Wrench size={10} style={{ color: "var(--grove-accent)" }} />
                <span style={{ color: "var(--grove-text-2)" }}>{tc.toolName}</span>
                <span className="opacity-50 ml-1 truncate max-w-[120px]">
                  {JSON.stringify(tc.input).slice(0, 40)}
                </span>
                {tc.durationMs ? (
                  <span className="ml-auto opacity-40">{tc.durationMs}ms</span>
                ) : null}
                {expandedTools[i] ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
              </button>

              {expandedTools[i] && (
                <div className="space-y-1 pl-4">
                  <div
                    className="text-[10px] p-1.5 rounded"
                    style={{ background: "var(--grove-surface-3)", fontFamily: "var(--font-geist-mono)", color: "var(--grove-text-3)" }}
                  >
                    <span className="opacity-60">in:</span>{" "}
                    {JSON.stringify(tc.input, null, 2).slice(0, 200)}
                  </div>
                  <div
                    className="text-[10px] p-1.5 rounded"
                    style={{ background: "var(--grove-surface-3)", fontFamily: "var(--font-geist-mono)", color: "var(--grove-text-3)" }}
                  >
                    <span className="opacity-60">out:</span>{" "}
                    {JSON.stringify(tc.output, null, 2).slice(0, 400)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
