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
    <div className="space-y-2">
      {/* Main comment */}
      <div className="rounded-lg border bg-card p-3 space-y-2">
        {/* Author and timestamp row */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isAI
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isAI ? "AI" : "You"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {/* Selected text quote */}
        {comment.selectedText && (
          <div className="border-l-2 border-muted-foreground/30 pl-2 py-0.5">
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              &ldquo;{comment.selectedText}&rdquo;
            </p>
          </div>
        )}

        {/* Comment body */}
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {comment.body}
        </p>

        {/* Actions */}
        {!comment.resolved && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onResolve(comment._id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Resolve
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          </div>
        )}

        {comment.resolved && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            Resolved
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-4 space-y-2">
          {replies.map((reply: any) => {
            const replyIsAI = reply.author === "ai";
            return (
              <div
                key={reply._id}
                className="rounded-lg border bg-card p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      replyIsAI
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {replyIsAI ? "AI" : "You"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(reply.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput && (
        <div className="ml-4">
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
