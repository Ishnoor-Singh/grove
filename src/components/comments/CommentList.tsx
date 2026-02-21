"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageSquare } from "lucide-react";
import { CommentThread } from "./CommentThread";

interface CommentListProps {
  noteId: string;
}

export function CommentList({ noteId }: CommentListProps) {
  const typedNoteId = noteId as Id<"notes">;
  const comments = useQuery(api.comments.listByNote, { noteId: typedNoteId });
  const createComment = useMutation(api.comments.create);
  const resolveComment = useMutation(api.comments.resolve);

  if (comments === undefined) {
    return (
      <div className="p-4">
        <p
          className="text-xs"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          Loading...
        </p>
      </div>
    );
  }

  // Separate root comments from replies
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, typeof comments>();
  for (const comment of comments) {
    if (comment.parentId) {
      const parentId = comment.parentId as string;
      if (!repliesByParent.has(parentId)) {
        repliesByParent.set(parentId, []);
      }
      repliesByParent.get(parentId)!.push(comment);
    }
  }

  const handleReply = async (body: string, parentId: string) => {
    const parent = comments.find((c) => c._id === parentId);
    if (!parent) return;

    await createComment({
      noteId: typedNoteId,
      blockId: parent.blockId,
      body,
      author: "user",
      parentId: parentId as Id<"comments">,
    });
  };

  const handleResolve = async (commentId: string) => {
    await resolveComment({
      commentId: commentId as Id<"comments">,
    });
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={12} style={{ color: "var(--grove-text-3)" }} />
        <h3
          className="text-[10px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          Comments
        </h3>
        {rootComments.length > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--grove-surface-2)",
              color: "var(--grove-text-3)",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            {rootComments.length}
          </span>
        )}
      </div>

      {/* Comment threads */}
      {rootComments.length === 0 ? (
        <div className="text-center py-8 flex flex-col items-center gap-2">
          <MessageSquare size={24} style={{ color: "var(--grove-border-2)" }} />
          <p className="text-xs" style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}>
            no comments yet
          </p>
          <p className="text-[10px]" style={{ color: "var(--grove-text-3)", opacity: 0.6 }}>
            select text to comment
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rootComments.map((comment) => (
            <CommentThread
              key={comment._id}
              comment={comment}
              replies={repliesByParent.get(comment._id as string) ?? []}
              onReply={handleReply}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
