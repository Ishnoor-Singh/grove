"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AITagBadge from "../ai/AITagBadge";
import { useEffect, useState, useCallback } from "react";

interface BlockTagIndicatorProps {
  noteId: string;
}

export default function BlockTagIndicator({ noteId }: BlockTagIndicatorProps) {
  const typedNoteId = noteId as Id<"notes">;
  const tags = useQuery(api.tags.listByNote, { noteId: typedNoteId });
  const [positions, setPositions] = useState<Record<string, DOMRect>>({});

  const updatePositions = useCallback(() => {
    if (!tags) return;
    const blockIds = [...new Set(tags.map((t) => t.blockId))];
    const newPositions: Record<string, DOMRect> = {};
    for (const blockId of blockIds) {
      const el = document.querySelector(`[data-id="${blockId}"]`);
      if (el) {
        newPositions[blockId] = el.getBoundingClientRect();
      }
    }
    setPositions(newPositions);
  }, [tags]);

  useEffect(() => {
    updatePositions();
    const observer = new ResizeObserver(updatePositions);
    const editor = document.querySelector(".bn-editor");
    if (editor) observer.observe(editor);
    window.addEventListener("scroll", updatePositions, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [updatePositions]);

  if (!tags || tags.length === 0) return null;

  const tagsByBlock = tags.reduce(
    (acc, tag) => {
      if (!acc[tag.blockId]) acc[tag.blockId] = [];
      acc[tag.blockId].push(tag);
      return acc;
    },
    {} as Record<string, typeof tags>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {Object.entries(tagsByBlock).map(([blockId, blockTags]) => {
        const rect = positions[blockId];
        if (!rect) return null;
        return (
          <div
            key={blockId}
            className="absolute pointer-events-auto flex gap-1"
            style={{ top: rect.top + 4, left: rect.right + 8 }}
          >
            {blockTags.map((tag, i) => (
              <AITagBadge key={i} tag={tag.tag} confidence={tag.confidence} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
