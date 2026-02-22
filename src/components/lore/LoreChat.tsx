"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import LoreChatMessage from "./LoreChatMessage";
import LoreChatInput from "./LoreChatInput";
import { Sparkles } from "lucide-react";

interface LoreChatProps {
  sessionId: string;
}

export default function LoreChat({ sessionId }: LoreChatProps) {
  const typedId = sessionId as Id<"loreConversations">;
  const messages = useQuery(api.loreChatMessages.listBySession, { sessionId: typedId });
  const send = useMutation(api.loreChatMessages.send);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages?.length && messages[messages.length - 1].role === "assistant") {
      setSending(false);
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    setSending(true);
    try {
      await send({ sessionId: typedId, content });
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {(!messages || messages.length === 0) && (
          <div
            className="flex flex-col items-center justify-center h-full gap-4 text-center"
            style={{ color: "var(--grove-text-3)" }}
          >
            <Sparkles size={32} style={{ color: "var(--grove-accent-border)" }} />
            <div>
              <p className="text-sm" style={{ color: "var(--grove-text-2)" }}>
                Hi, I&apos;m Lore.
              </p>
              <p className="text-xs mt-1" style={{ fontFamily: "var(--font-geist-mono)" }}>
                I can manage your notes, search the web, and answer questions across your knowledge base.
              </p>
            </div>
          </div>
        )}

        {messages?.map((msg) => (
          <LoreChatMessage
            key={msg._id}
            role={msg.role}
            content={msg.content}
            thinkingContent={msg.thinkingContent}
            toolCalls={msg.toolCalls}
          />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="rounded-lg p-3 text-xs"
              style={{ background: "var(--grove-surface-2)", border: "1px solid var(--grove-border)" }}
            >
              <div
                className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5"
                style={{ color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
              >
                Lore
              </div>
              <span className="animate-pulse" style={{ color: "var(--grove-text-3)" }}>
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      <LoreChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
