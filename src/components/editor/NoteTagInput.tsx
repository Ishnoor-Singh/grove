"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef, KeyboardEvent } from "react";
import { Tag, X, Plus } from "lucide-react";

interface NoteTagInputProps {
  noteId: string;
  tags: string[];
}

export default function NoteTagInput({ noteId, tags }: NoteTagInputProps) {
  const updateTags = useMutation(api.notes.updateTags);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = async (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (!tag || tags.includes(tag)) return;
    await updateTags({ noteId: noteId as Id<"notes">, tags: [...tags, tag] });
    setInputValue("");
  };

  const removeTag = async (tag: string) => {
    await updateTags({
      noteId: noteId as Id<"notes">,
      tags: tags.filter((t) => t !== tag),
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === "Escape") {
      setInputValue("");
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-3">
      <Tag
        size={12}
        style={{ color: "var(--grove-text-3)" }}
        className="shrink-0"
      />

      {tags.map((tag) => (
        <span
          key={tag}
          className="group flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono"
          style={{
            background: "var(--grove-accent-dim)",
            color: "var(--grove-accent)",
            border: "1px solid var(--grove-accent-border)",
          }}
        >
          #{tag}
          <button
            onClick={() => removeTag(tag)}
            className="opacity-50 hover:opacity-100 transition-opacity"
            aria-label={`Remove tag ${tag}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {isEditing ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue) addTag(inputValue);
            setIsEditing(false);
          }}
          placeholder="add tag..."
          className="text-xs bg-transparent border-none outline-none font-mono min-w-[80px]"
          style={{ color: "var(--grove-text-2)" }}
          autoFocus
        />
      ) : (
        <button
          onClick={() => {
            setIsEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center gap-1 text-xs transition-colors px-1.5 py-0.5 rounded-full font-mono"
          style={{ color: "var(--grove-text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--grove-accent)";
            (e.currentTarget as HTMLElement).style.background =
              "var(--grove-accent-dim)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--grove-text-3)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <Plus size={10} />
          {tags.length === 0 && <span>add tag</span>}
        </button>
      )}
    </div>
  );
}
