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
      className="fixed z-50 bg-white shadow-lg rounded-lg border p-3 min-w-[320px]"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      {/* Selected text quote */}
      <div className="border-l-2 border-muted-foreground/30 pl-2 mb-3">
        <p className="text-xs text-muted-foreground italic line-clamp-2">
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
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleAIAction("improve")}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Suggest Improvement
        </button>
        <button
          onClick={() => handleAIAction("fact_check")}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <ShieldCheck className="h-3 w-3" />
          Fact Check
        </button>
        <button
          onClick={() => handleAIAction("find_related")}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
        >
          <Link2 className="h-3 w-3" />
          Find Related
        </button>
      </div>
    </div>
  );
}
