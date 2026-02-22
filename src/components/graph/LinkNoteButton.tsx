"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Link2 } from "lucide-react";

interface LinkNoteButtonProps {
  noteId: string;
}

export default function LinkNoteButton({ noteId }: LinkNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const notes = useQuery(api.notes.list);
  const createLink = useMutation(api.noteLinks.create);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-link-note-button]")) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = (notes ?? []).filter(
    (n) =>
      n._id !== noteId &&
      (n.title || "Untitled").toLowerCase().includes(queryText.toLowerCase())
  );

  const handleLink = async (targetId: Id<"notes">) => {
    await createLink({
      sourceNoteId: noteId as Id<"notes">,
      targetNoteId: targetId,
    });
    setOpen(false);
    setQueryText("");
  };

  return (
    <div data-link-note-button style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "var(--grove-text-3)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-geist-mono)",
          padding: "2px 0",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"; }}
      >
        <Link2 size={11} />
        link note
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 50,
            marginTop: 4,
            width: 260,
            background: "var(--grove-surface-2)",
            border: "1px solid var(--grove-border)",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <input
            ref={inputRef}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search notes..."
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--grove-border)",
              outline: "none",
              fontSize: 12,
              color: "var(--grove-text)",
              fontFamily: "var(--font-geist-mono)",
              boxSizing: "border-box",
            }}
          />
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}>
                no notes found
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleLink(n._id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    fontSize: 12,
                    color: "var(--grove-text-2)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--grove-surface)";
                    (e.currentTarget as HTMLElement).style.color = "var(--grove-text)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--grove-text-2)";
                  }}
                >
                  {n.title || "Untitled"}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
