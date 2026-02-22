"use client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import LoreChat from "./LoreChat";
import { X } from "lucide-react";

export default function LoreDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const createSession = useMutation(api.loreConversations.create);

  useEffect(() => {
    const stored = sessionStorage.getItem("grove:loreDrawerSession");
    if (stored) {
      setSessionId(stored);
    } else {
      createSession().then((id) => {
        sessionStorage.setItem("grove:loreDrawerSession", id);
        setSessionId(id);
      });
    }
  }, [createSession]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <span
          className="text-xs font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          Lore
        </span>
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

      {sessionId ? (
        <LoreChat sessionId={sessionId} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-xs animate-pulse"
            style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
          >
            Starting Lore...
          </span>
        </div>
      )}
    </div>
  );
}
