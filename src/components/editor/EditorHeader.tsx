"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import NoteTagInput from "./NoteTagInput";

interface EditorHeaderProps {
  noteId: string;
  title: string;
}

export default function EditorHeader({ noteId, title }: EditorHeaderProps) {
  const updateTitle = useMutation(api.notes.updateTitle);
  const note = useQuery(api.notes.get, { noteId: noteId as Id<"notes"> });
  const [currentTitle, setCurrentTitle] = useState(title);

  const handleBlur = async () => {
    const trimmed = currentTitle.trim();
    const newTitle = trimmed || "Untitled";
    if (newTitle !== title) {
      await updateTitle({ noteId: noteId as Id<"notes">, title: newTitle });
    }
  };

  return (
    <div className="px-12 pt-12 pb-6">
      <input
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="w-full border-none outline-none bg-transparent font-display"
        placeholder="Untitled"
        style={{
          fontSize: "clamp(2rem, 4vw, 2.75rem)",
          fontStyle: "italic",
          fontWeight: 400,
          lineHeight: 1.2,
          color: "var(--grove-text)",
          letterSpacing: "-0.01em",
        }}
      />

      {/* Note-level tags */}
      <NoteTagInput noteId={noteId} tags={note?.tags ?? []} />

      {/* Hairline separator */}
      <div
        className="mt-4"
        style={{
          height: "1px",
          background:
            "linear-gradient(to right, var(--grove-border), transparent 80%)",
        }}
      />
    </div>
  );
}
