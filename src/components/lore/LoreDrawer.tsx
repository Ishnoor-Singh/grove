"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import LoreChat from "./LoreChat";
import { X, Plus, ArrowLeft, MessageSquare } from "lucide-react";

export default function LoreDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const createSession = useMutation(api.loreConversations.create);
  const conversations = useQuery(api.loreConversations.list);
  const activeConversation = useQuery(
    api.loreConversations.get,
    sessionId ? { sessionId: sessionId as Id<"loreConversations"> } : "skip"
  );

  const handleNewConversation = async () => {
    const id = await createSession();
    setSessionId(id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <div className="flex items-center gap-2">
          {sessionId && (
            <button
              onClick={() => setSessionId(null)}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--grove-text-3)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
              title="Back to conversations"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <span
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
          >
            {sessionId && activeConversation ? activeConversation.title : "Lore"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!sessionId && (
            <button
              onClick={handleNewConversation}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--grove-text-3)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
              title="New conversation"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--grove-text-3)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {sessionId ? (
        <LoreChat sessionId={sessionId} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {conversations === undefined ? (
            <div className="flex items-center justify-center h-full">
              <span
                className="text-xs animate-pulse"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                Loading...
              </span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <MessageSquare size={32} style={{ color: "var(--grove-accent-border)" }} />
              <div>
                <p className="text-sm" style={{ color: "var(--grove-text-2)" }}>
                  No conversations yet.
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}>
                  Start a new conversation to chat with Lore.
                </p>
              </div>
              <button
                onClick={handleNewConversation}
                className="px-3 py-1.5 text-xs rounded transition-colors"
                style={{
                  background: "var(--grove-accent)",
                  color: "var(--grove-bg)",
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                + New conversation
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => setSessionId(conv._id)}
                  className="w-full text-left px-3 py-2 rounded text-xs transition-colors"
                  style={{
                    color: "var(--grove-text-2)",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-2)";
                    (e.currentTarget as HTMLElement).style.color = "var(--grove-text)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.color = "var(--grove-text-2)";
                  }}
                >
                  <div className="font-medium truncate">{conv.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--grove-text-3)" }}>
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
