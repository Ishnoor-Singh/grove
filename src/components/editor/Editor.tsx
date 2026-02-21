"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCallback, useEffect, useRef } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import EditorHeader from "./EditorHeader";
import BlockTagIndicator from "./BlockTagIndicator";
import { CommentPopover } from "../comments/CommentPopover";
import { CommentList } from "../comments/CommentList";
import { useTextSelection } from "../../hooks/useTextSelection";

interface EditorProps {
  noteId: string;
}

function EditorInner({
  noteId,
  note,
}: {
  noteId: Id<"notes">;
  note: {
    _id: Id<"notes">;
    title: string;
    content: any;
    updatedAt: number;
    createdAt: number;
  };
}) {
  const updateNote = useMutation(api.notes.update);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(note.title);
  const { selection, clearSelection } = useTextSelection();

  useEffect(() => {
    titleRef.current = note.title;
  }, [note.title]);

  const editor = useCreateBlockNote({
    initialContent: note.content?.length ? note.content : undefined,
  });

  const handleChange = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const content = editor.document;
      updateNote({
        noteId,
        content: content as any,
        title: titleRef.current || "Untitled",
      });
    }, 1000);
  }, [editor, noteId, updateNote]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Editor + Tags area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <EditorHeader noteId={noteId} title={note.title} />
          <div className="px-4 pb-8">
            <BlockNoteView
              editor={editor}
              onChange={handleChange}
              theme="light"
            />
          </div>
        </div>
        <BlockTagIndicator noteId={noteId} />
      </div>

      {/* Right: Comments panel */}
      <div className="w-72 border-l border-gray-200 shrink-0 overflow-y-auto hidden lg:block">
        <CommentList noteId={noteId} />
      </div>

      {/* Comment popover on text selection */}
      <CommentPopover
        noteId={noteId}
        selection={
          selection
            ? {
                text: selection.text,
                blockId: selection.blockId || "",
                rect: selection.rect!,
              }
            : null
        }
        onClose={clearSelection}
      />
    </div>
  );
}

export default function Editor({ noteId }: EditorProps) {
  const typedNoteId = noteId as Id<"notes">;
  const note = useQuery(api.notes.get, { noteId: typedNoteId });

  if (!note) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      </div>
    );
  }

  return <EditorInner key={note._id} noteId={typedNoteId} note={note} />;
}
