"use client";
import { useState } from "react";
import { CheckCircle, Reply } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { CommentInput } from "./CommentInput";

interface CommentThreadProps {
  comment: any;
  replies: any[];
  onReply: (body: string, parentId: string) => void;
  onResolve: (commentId: string) => void;
}

export function CommentThread({
  comment,
  replies,
  onReply,
  onResolve,
}: CommentThreadProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);

  const isAI = comment.author === "ai";

  return (
    <div className="space-y-1.5">
      {/* Main comment */}
      <div
        className="rounded-md p-3 space-y-2"
        style={{
          background: "var(--grove-surface-2)",
          border: "1px solid var(--grove-border)",
        }}
      >
        {/* Author and timestamp row */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-[0.06em] uppercase"
            style={
              isAI
                ? { background: "rgba(137,180,255,0.08)", color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }
                : { background: "rgba(128,180,255,0.08)", color: "#80b4ff", fontFamily: "var(--font-geist-mono)" }
            }
          >
            {isAI ? "AI" : "You"}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
          >
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {/* Selected text quote */}
        {comment.selectedText && (
          <div
            className="pl-2 py-0.5"
            style={{ borderLeft: "2px solid var(--grove-border-2)" }}
          >
            <p
              className="text-[11px] italic line-clamp-2"
              style={{ color: "var(--grove-text-3)" }}
            >
              &ldquo;{comment.selectedText}&rdquo;
            </p>
          </div>
        )}

        {/* Comment body */}
        <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--grove-text)" }}>
          {comment.body}
        </p>

        {/* Actions */}
        {!comment.resolved && (
          <div className="flex items-center gap-3 pt-0.5">
            <button
              onClick={() => onResolve(comment._id)}
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
            >
              <CheckCircle size={11} />
              resolve
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-[10px] transition-colors"
              style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
            >
              <Reply size={11} />
              reply
            </button>
          </div>
        )}

        {comment.resolved && (
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
          >
            <CheckCircle size={11} />
            resolved
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-3 space-y-1.5">
          {replies.map((reply: any) => {
            const replyIsAI = reply.author === "ai";
            return (
              <div
                key={reply._id}
                className="rounded-md p-2.5 space-y-1.5"
                style={{
                  background: "var(--grove-surface-3)",
                  border: "1px solid var(--grove-border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-[0.06em] uppercase"
                    style={
                      replyIsAI
                        ? { background: "rgba(137,180,255,0.08)", color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }
                        : { background: "rgba(128,180,255,0.08)", color: "#80b4ff", fontFamily: "var(--font-geist-mono)" }
                    }
                  >
                    {replyIsAI ? "AI" : "You"}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
                  >
                    {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--grove-text)" }}>
                  {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput && (
        <div className="ml-3">
          <CommentInput
            placeholder="Write a reply..."
            autoFocus
            onSubmit={(body) => {
              onReply(body, comment._id);
              setShowReplyInput(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
