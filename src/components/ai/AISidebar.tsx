"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AIChatMessage from "./AIChatMessage";
import AIChatInput from "./AIChatInput";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

interface AISidebarProps {
  noteId: string;
}

export default function AISidebar({ noteId }: AISidebarProps) {
  const typedNoteId = noteId as Id<"notes">;
  const messages = useQuery(api.chat.listByNote, { noteId: typedNoteId });
  const sendMessage = useMutation(api.chat.sendMessage);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset sending state when an assistant message arrives
  useEffect(() => {
    if (messages && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        setSending(false);
      }
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    setSending(true);
    try {
      await sendMessage({ noteId: typedNoteId, content });
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3.5 flex items-center gap-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <Sparkles
          size={13}
          style={{ color: "var(--grove-accent)" }}
        />
        <h2
          className="text-xs font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          Grove AI
        </h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {(!messages || messages.length === 0) && (
          <div
            className="flex flex-col items-center justify-center h-full text-center px-4 gap-3"
            style={{ color: "var(--grove-text-3)" }}
          >
            <Sparkles size={28} style={{ color: "var(--grove-accent-border)" }} />
            <p className="text-xs" style={{ fontFamily: "var(--font-geist-mono)" }}>
              Ask me anything about this note
            </p>
          </div>
        )}

        {messages?.map((msg) => (
          <AIChatMessage
            key={msg._id}
            role={msg.role}
            content={msg.content}
            blockReferences={msg.blockReferences}
          />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="rounded-lg p-3 text-xs max-w-[85%]"
              style={{ background: "var(--grove-surface-2)", border: "1px solid var(--grove-border)" }}
            >
              <div
                className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5"
                style={{ color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
              >
                Grove AI
              </div>
              <span
                className="animate-pulse"
                style={{ color: "var(--grove-text-3)" }}
              >
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <AIChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
