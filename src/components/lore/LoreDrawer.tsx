"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import LoreChat from "./LoreChat";
import { X, Plus, MessageSquare, Trash2, ChevronLeft } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function LoreDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const createSession = useMutation(api.loreConversations.create);
  const renameSession = useMutation(api.loreConversations.rename);
  const removeSession = useMutation(api.loreConversations.remove);
  const sessions = useQuery(api.loreConversations.list);
  const currentSession = useQuery(
    api.loreConversations.get,
    sessionId ? { sessionId: sessionId as Id<"loreConversations"> } : "skip"
  );

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

  // Sync title draft when session title changes (e.g. after auto-naming)
  useEffect(() => {
    if (currentSession?.title && !editingTitle) {
      setTitleDraft(currentSession.title);
    }
  }, [currentSession?.title, editingTitle]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  const handleNewSession = async () => {
    const id = await createSession();
    sessionStorage.setItem("grove:loreDrawerSession", id);
    setSessionId(id);
    setShowSessions(false);
  };

  const handleSelectSession = (id: string) => {
    sessionStorage.setItem("grove:loreDrawerSession", id);
    setSessionId(id);
    setShowSessions(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeSession({ sessionId: id as Id<"loreConversations"> });
    if (id === sessionId) {
      // Switch to most recent other session, or create a new one
      const remaining = sessions?.filter((s) => s._id !== id) ?? [];
      if (remaining.length > 0) {
        handleSelectSession(remaining[0]._id);
      } else {
        const newId = await createSession();
        sessionStorage.setItem("grove:loreDrawerSession", newId);
        setSessionId(newId);
      }
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitTitle();
    if (e.key === "Escape") {
      setTitleDraft(currentSession?.title ?? "New conversation");
      setEditingTitle(false);
    }
  };

  const commitTitle = async () => {
    if (!sessionId) return;
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== currentSession?.title) {
      await renameSession({
        sessionId: sessionId as Id<"loreConversations">,
        title: trimmed,
      });
    } else {
      setTitleDraft(currentSession?.title ?? "New conversation");
    }
  };

  const displayTitle = currentSession?.title ?? "Lore";
  const isDefaultTitle =
    !currentSession?.title || currentSession.title === "New conversation";

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        {/* Sessions toggle */}
        <button
          onClick={() => setShowSessions((v) => !v)}
          className="p-1 rounded transition-colors shrink-0"
          style={{ color: showSessions ? "var(--grove-accent)" : "var(--grove-text-3)" }}
          title="Conversations"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--grove-accent)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = showSessions
              ? "var(--grove-accent)"
              : "var(--grove-text-3)")
          }
        >
          <MessageSquare size={13} />
        </button>

        {/* Editable title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              className="w-full bg-transparent outline-none text-xs"
              style={{
                color: "var(--grove-text)",
                fontFamily: "var(--font-geist-mono)",
                border: "none",
                padding: 0,
              }}
              maxLength={80}
            />
          ) : (
            <button
              onClick={() => {
                setTitleDraft(displayTitle);
                setEditingTitle(true);
              }}
              className="w-full text-left truncate text-xs transition-colors"
              style={{
                color: isDefaultTitle ? "var(--grove-text-3)" : "var(--grove-text-2)",
                fontFamily: "var(--font-geist-mono)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "text",
                letterSpacing: isDefaultTitle ? "0.15em" : undefined,
                textTransform: isDefaultTitle ? "uppercase" : undefined,
                fontWeight: isDefaultTitle ? 600 : undefined,
              }}
              title="Click to rename"
            >
              {displayTitle}
            </button>
          )}
        </div>

        {/* New conversation */}
        <button
          onClick={handleNewSession}
          className="p-1 rounded transition-colors shrink-0"
          style={{ color: "var(--grove-text-3)" }}
          title="New conversation"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--grove-accent)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)")
          }
        >
          <Plus size={13} />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors shrink-0"
          style={{ color: "var(--grove-text-3)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--grove-text)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)")
          }
        >
          <X size={13} />
        </button>
      </div>

      {/* Sessions panel (slides in) */}
      {showSessions && (
        <div
          className="absolute inset-0 z-10 flex flex-col"
          style={{
            top: "calc(2.5rem + 1px)", // below header
            background: "var(--grove-bg)",
          }}
        >
          <div className="px-4 py-2 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSessions(false)}
              className="p-0.5 rounded transition-colors"
              style={{ color: "var(--grove-text-3)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--grove-text)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)")
              }
            >
              <ChevronLeft size={13} />
            </button>
            <span
              className="text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
            >
              Conversations
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {sessions?.length === 0 && (
              <p
                className="px-4 py-3 text-xs"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                No conversations yet.
              </p>
            )}
            {sessions?.map((session) => {
              const isActive = session._id === sessionId;
              return (
                <div
                  key={session._id}
                  onClick={() => handleSelectSession(session._id)}
                  className="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    background: isActive ? "var(--grove-surface-2)" : "transparent",
                    borderLeft: isActive
                      ? "2px solid var(--grove-accent)"
                      : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--grove-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <MessageSquare
                    size={11}
                    style={{ color: "var(--grove-text-3)", flexShrink: 0 }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs truncate"
                      style={{
                        color: isActive ? "var(--grove-text)" : "var(--grove-text-2)",
                      }}
                    >
                      {session.title}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{
                        color: "var(--grove-text-3)",
                        fontFamily: "var(--font-geist-mono)",
                      }}
                    >
                      {formatRelativeTime(session.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session._id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all shrink-0"
                    style={{ color: "var(--grove-text-3)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color =
                        "rgba(255,100,100,0.7)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)")
                    }
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="px-3 py-2 shrink-0"
            style={{ borderTop: "1px solid var(--grove-border)" }}
          >
            <button
              onClick={handleNewSession}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
              style={{
                color: "var(--grove-text-3)",
                background: "transparent",
                border: "1px solid var(--grove-border)",
                fontFamily: "var(--font-geist-mono)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-text)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--grove-accent-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--grove-border)";
              }}
            >
              <Plus size={11} />
              New conversation
            </button>
          </div>
        </div>
      )}

      {/* Chat */}
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
