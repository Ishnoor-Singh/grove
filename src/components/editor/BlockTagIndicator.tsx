"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AITagBadge from "../ai/AITagBadge";
import { useEffect, useState, useCallback } from "react";
import { Plus, X } from "lucide-react";

interface BlockTagIndicatorProps {
  noteId: string;
}

function UserTagBadge({
  tag,
  tagId,
  onRemove,
}: {
  tag: string;
  tagId: Id<"userBlockTags">;
  onRemove: (id: Id<"userBlockTags">) => void;
}) {
  return (
    <span
      className="group/badge flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono cursor-default"
      style={{
        background: "var(--grove-accent-dim)",
        color: "var(--grove-accent)",
        border: "1px solid var(--grove-accent-border)",
      }}
    >
      #{tag}
      <button
        onClick={() => onRemove(tagId)}
        className="opacity-0 group-hover/badge:opacity-100 transition-opacity"
        aria-label={`Remove tag ${tag}`}
      >
        <X size={9} />
      </button>
    </span>
  );
}

function AddUserTagButton({
  noteId,
  blockId,
}: {
  noteId: Id<"notes">;
  blockId: string;
}) {
  const addTag = useMutation(api.userBlockTags.addTag);
  const [inputOpen, setInputOpen] = useState(false);
  const [value, setValue] = useState("");

  const submit = async () => {
    const tag = value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (tag) {
      await addTag({ noteId, blockId, tag });
    }
    setValue("");
    setInputOpen(false);
  };

  if (inputOpen) {
    return (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setValue("");
            setInputOpen(false);
          }
        }}
        onBlur={submit}
        placeholder="tag..."
        className="text-[10px] font-mono bg-transparent border-none outline-none w-16"
        style={{
          color: "var(--grove-text-2)",
          borderBottom: "1px solid var(--grove-border)",
        }}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setInputOpen(true)}
      className="flex items-center justify-center w-4 h-4 rounded-full opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      style={{
        background: "var(--grove-accent-dim)",
        color: "var(--grove-accent)",
        border: "1px solid var(--grove-accent-border)",
      }}
      title="Add block tag"
    >
      <Plus size={9} />
    </button>
  );
}

export default function BlockTagIndicator({ noteId }: BlockTagIndicatorProps) {
  const typedNoteId = noteId as Id<"notes">;
  const aiTags = useQuery(api.tags.listByNote, { noteId: typedNoteId });
  const userTags = useQuery(api.userBlockTags.listByNote, { noteId: typedNoteId });
  const removeUserTag = useMutation(api.userBlockTags.removeTag);
  const [positions, setPositions] = useState<Record<string, DOMRect>>({});

  const updatePositions = useCallback(() => {
    // Collect block IDs from all sources
    const taggedBlockIds = new Set([
      ...(aiTags ?? []).map((t) => t.blockId),
      ...(userTags ?? []).map((t) => t.blockId),
    ]);

    // Also pick up all editor block IDs for the "+ add tag" affordance
    const allEditorBlocks = document.querySelectorAll<HTMLElement>(
      ".bn-editor [data-id]"
    );
    const allBlockIds = new Set<string>(taggedBlockIds);
    for (const el of allEditorBlocks) {
      const id = el.getAttribute("data-id");
      if (id) allBlockIds.add(id);
    }

    const newPositions: Record<string, DOMRect> = {};
    for (const blockId of allBlockIds) {
      const el = document.querySelector(`[data-id="${blockId}"]`);
      if (el) {
        newPositions[blockId] = el.getBoundingClientRect();
      }
    }
    setPositions(newPositions);
  }, [aiTags, userTags]);

  useEffect(() => {
    updatePositions();
    const observer = new ResizeObserver(updatePositions);
    const editor = document.querySelector(".bn-editor");
    if (editor) {
      observer.observe(editor);
      // Also observe DOM mutations (blocks added/removed)
      const mutationObserver = new MutationObserver(updatePositions);
      mutationObserver.observe(editor, { childList: true, subtree: true });
      window.addEventListener("scroll", updatePositions, true);
      return () => {
        observer.disconnect();
        mutationObserver.disconnect();
        window.removeEventListener("scroll", updatePositions, true);
      };
    }
    window.addEventListener("scroll", updatePositions, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [updatePositions]);

  if (aiTags === undefined || userTags === undefined) return null;

  const aiTagsByBlock = aiTags.reduce(
    (acc, tag) => {
      if (!acc[tag.blockId]) acc[tag.blockId] = [];
      acc[tag.blockId].push(tag);
      return acc;
    },
    {} as Record<string, typeof aiTags>
  );

  const userTagsByBlock = userTags.reduce(
    (acc, tag) => {
      if (!acc[tag.blockId]) acc[tag.blockId] = [];
      acc[tag.blockId].push(tag);
      return acc;
    },
    {} as Record<string, typeof userTags>
  );

  // Only render indicator rows for blocks that have tags or are in the editor
  const renderedBlockIds = Object.keys(positions);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {renderedBlockIds.map((blockId) => {
        const rect = positions[blockId];
        if (!rect) return null;
        const blockAiTags = aiTagsByBlock[blockId] ?? [];
        const blockUserTags = userTagsByBlock[blockId] ?? [];

        // Skip rendering if no tags and no position (shouldn't happen)
        return (
          <div
            key={blockId}
            className="group absolute pointer-events-auto flex flex-col gap-1"
            style={{ top: rect.top + 4, left: rect.right + 8 }}
          >
            {/* AI tags row */}
            {blockAiTags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {blockAiTags.map((tag, i) => (
                  <AITagBadge key={i} tag={tag.tag} confidence={tag.confidence} />
                ))}
              </div>
            )}

            {/* User tags + add button */}
            <div className="flex gap-1 flex-wrap items-center">
              {blockUserTags.map((tag, i) => (
                <UserTagBadge
                  key={i}
                  tag={tag.tag}
                  tagId={tag._id}
                  onRemove={(id) => removeUserTag({ tagId: id })}
                />
              ))}
              <AddUserTagButton noteId={typedNoteId} blockId={blockId} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
