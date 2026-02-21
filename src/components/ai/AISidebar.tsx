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
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h2 className="font-semibold text-sm text-gray-900">Grove AI</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center px-4">
            <Sparkles className="h-8 w-8 mb-3 text-gray-300" />
            <p>Ask me anything about this note</p>
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
            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-500">
              <div className="text-xs font-medium text-gray-500 mb-1">
                Grove AI
              </div>
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <AIChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
