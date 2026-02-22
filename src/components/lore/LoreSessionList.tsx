"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface LoreSessionListProps {
  currentSessionId: string;
}

export default function LoreSessionList({ currentSessionId }: LoreSessionListProps) {
  const sessions = useQuery(api.loreConversations.list);
  const createSession = useMutation(api.loreConversations.create);
  const removeSession = useMutation(api.loreConversations.remove);
  const router = useRouter();

  const handleNew = async () => {
    const id = await createSession();
    router.push(`/chat/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeSession({ sessionId: id as Id<"loreConversations"> });
    if (id === currentSessionId) router.push("/chat");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <span
          className="text-[10px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          Lore
        </span>
        <button
          onClick={handleNew}
          className="p-1 rounded transition-colors"
          style={{ color: "var(--grove-text-3)" }}
          title="New conversation"
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions?.map((session) => {
          const isActive = session._id === currentSessionId;
          return (
            <div
              key={session._id}
              onClick={() => router.push(`/chat/${session._id}`)}
              className="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors relative"
              style={{
                background: isActive ? "var(--grove-surface-2)" : "transparent",
                borderLeft: isActive ? "2px solid var(--grove-accent)" : "2px solid transparent",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-2)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <MessageSquare size={11} style={{ color: "var(--grove-text-3)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs truncate"
                  style={{ color: isActive ? "var(--grove-text)" : "var(--grove-text-2)" }}
                >
                  {session.title}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
                >
                  {formatRelativeTime(session.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session._id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                style={{ color: "var(--grove-text-3)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,100,100,0.7)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
