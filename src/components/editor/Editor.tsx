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

// Custom dark theme matching Grove's deep blue palette
const groveTheme = {
  colors: {
    editor: {
      text: "#e0dace",
      background: "#0b1018",
    },
    menu: {
      text: "#e0dace",
      background: "#0f1620",
    },
    tooltip: {
      text: "#e0dace",
      background: "#131d2a",
    },
    hovered: {
      text: "#e0dace",
      background: "#131d2a",
    },
    selected: {
      text: "#06080e",
      background: "#89b4ff",
    },
    disabled: {
      text: "#374d68",
      background: "#0b1018",
    },
    shadow: "rgba(0, 0, 0, 0.6)",
    border: "#172338",
    sideMenu: "#374d68",
    highlights: {
      gray:   { text: "#94a3b8", background: "#181c24" },
      brown:  { text: "#d4a574", background: "#1a1208" },
      red:    { text: "#ff8080", background: "#1a0808" },
      orange: { text: "#ffb380", background: "#1a1008" },
      yellow: { text: "#ffd700", background: "#1a1808" },
      green:  { text: "#7defa8", background: "#081a10" },
      blue:   { text: "#89b4ff", background: "#080e1a" },
      purple: { text: "#c580ff", background: "#10081a" },
      pink:   { text: "#ff80c8", background: "#1a0812" },
    },
  },
  borderRadius: 6,
  fontFamily: "var(--font-geist-sans)",
} as const;

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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateNote({
        noteId,
        content: editor.document as any,
        title: titleRef.current || "Untitled",
      });
    }, 1000);
  }, [editor, noteId, updateNote]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Editor column */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <EditorHeader noteId={noteId} title={note.title} />
        <div className="px-12 pb-16">
          <BlockNoteView
            editor={editor}
            onChange={handleChange}
            theme={groveTheme}
          />
        </div>
        <BlockTagIndicator noteId={noteId} />
      </div>

      {/* Comments panel */}
      <div
        className="w-64 shrink-0 overflow-y-auto hidden lg:block"
        style={{ borderLeft: "1px solid var(--grove-border)", background: "var(--grove-bg)" }}
      >
        <CommentList noteId={noteId} />
      </div>

      {/* Comment popover on text selection */}
      <CommentPopover
        noteId={noteId}
        selection={
          selection
            ? { text: selection.text, blockId: selection.blockId || "", rect: selection.rect! }
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
      <div className="px-12 pt-12">
        <div className="animate-pulse space-y-5">
          <div className="h-10 rounded w-2/5" style={{ background: "var(--grove-surface-2)" }} />
          <div className="h-px w-full" style={{ background: "var(--grove-border)" }} />
          <div className="space-y-3 mt-8">
            <div className="h-4 rounded w-full" style={{ background: "var(--grove-surface-2)" }} />
            <div className="h-4 rounded w-4/5" style={{ background: "var(--grove-surface-2)" }} />
            <div className="h-4 rounded w-3/5" style={{ background: "var(--grove-surface-2)" }} />
          </div>
        </div>
      </div>
    );
  }

  return <EditorInner key={note._id} noteId={typedNoteId} note={note} />;
}
