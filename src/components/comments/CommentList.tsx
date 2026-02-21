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
        <p className="text-sm text-muted-foreground">Loading comments...</p>
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
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Comments</h3>
        {rootComments.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {rootComments.length}
          </span>
        )}
      </div>

      {/* Comment threads */}
      {rootComments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Select text in the editor to add a comment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
