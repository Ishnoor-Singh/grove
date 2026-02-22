"use client";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Sparkles, ShieldCheck, Link2 } from "lucide-react";
import { CommentInput } from "./CommentInput";

interface CommentPopoverProps {
  noteId: string;
  selection: {
    text: string;
    blockId: string;
    rect: DOMRect;
  } | null;
  onClose: () => void;
}

export function CommentPopover({
  noteId,
  selection,
  onClose,
}: CommentPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const createComment = useMutation(api.comments.create);
  const typedNoteId = noteId as Id<"notes">;

  // Click outside to dismiss
  useEffect(() => {
    if (!selection) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    // Delay attaching to avoid the same mouseup that triggered the popover
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selection, onClose]);

  if (!selection) return null;

  // Position below the selection
  const top = selection.rect.bottom + window.scrollY + 8;
  const left = Math.max(
    8,
    Math.min(
      selection.rect.left + selection.rect.width / 2 - 160,
      window.innerWidth - 340
    )
  );

  const handleUserComment = async (body: string) => {
    await createComment({
      noteId: typedNoteId,
      blockId: selection.blockId,
      body,
      author: "user",
      selectedText: selection.text,
    });
    onClose();
  };

  const handleAIAction = async (action: string) => {
    const actionLabels: Record<string, string> = {
      improve: "Suggest Improvement",
      fact_check: "Fact Check",
      find_related: "Find Related",
    };
    const label = actionLabels[action] ?? action;

    await createComment({
      noteId: typedNoteId,
      blockId: selection.blockId,
      body: `[${label}] requested for: "${selection.text}"`,
      author: "user",
      selectedText: selection.text,
    });
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 p-3 rounded-lg min-w-[300px]"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        background: "var(--grove-surface-2)",
        border: "1px solid var(--grove-border-2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(137,180,255,0.04)",
      }}
    >
      {/* Selected text quote */}
      <div
        className="pl-2 mb-3"
        style={{ borderLeft: "2px solid var(--grove-accent-border)" }}
      >
        <p
          className="text-[11px] italic line-clamp-2"
          style={{ color: "var(--grove-text-3)" }}
        >
          &ldquo;{selection.text}&rdquo;
        </p>
      </div>

      {/* Comment input */}
      <div className="mb-3">
        <CommentInput
          onSubmit={handleUserComment}
          placeholder="Add a comment..."
          autoFocus
        />
      </div>

      {/* AI action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => handleAIAction("improve")}
          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded transition-colors"
          style={{
            background: "rgba(137,180,255,0.06)",
            border: "1px solid rgba(137,180,255,0.15)",
            color: "var(--grove-accent)",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(137,180,255,0.12)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(137,180,255,0.06)"}
        >
          <Sparkles size={10} />
          improve
        </button>
        <button
          onClick={() => handleAIAction("fact_check")}
          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded transition-colors"
          style={{
            background: "rgba(128,180,255,0.06)",
            border: "1px solid rgba(128,180,255,0.15)",
            color: "#80b4ff",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(128,180,255,0.12)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(128,180,255,0.06)"}
        >
          <ShieldCheck size={10} />
          fact-check
        </button>
        <button
          onClick={() => handleAIAction("find_related")}
          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded transition-colors"
          style={{
            background: "rgba(197,128,255,0.06)",
            border: "1px solid rgba(197,128,255,0.15)",
            color: "#c580ff",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(197,128,255,0.12)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(197,128,255,0.06)"}
        >
          <Link2 size={10} />
          find related
        </button>
      </div>
    </div>
  );
}
