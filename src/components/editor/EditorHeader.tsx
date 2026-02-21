"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";

interface EditorHeaderProps {
  noteId: string;
  title: string;
}

export default function EditorHeader({ noteId, title }: EditorHeaderProps) {
  const updateTitle = useMutation(api.notes.updateTitle);
  const [currentTitle, setCurrentTitle] = useState(title);

  const handleBlur = async () => {
    const trimmed = currentTitle.trim();
    const newTitle = trimmed || "Untitled";
    if (newTitle !== title) {
      await updateTitle({
        noteId: noteId as Id<"notes">,
        title: newTitle,
      });
    }
  };

  return (
    <div className="px-4 py-6">
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
        className="w-full text-3xl font-bold border-none outline-none bg-transparent text-foreground placeholder-gray-300"
        placeholder="Untitled"
      />
    </div>
  );
}
