"use client";
import { useState, useEffect, useCallback } from "react";

interface TextSelection {
  text: string;
  blockId: string | null;
  rect: DOMRect | null;
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const clearSelection = useCallback(() => setSelection(null), []);

  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let the browser finalize the selection
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          return; // Don't clear on empty selection — let the popover handle its own dismiss
        }

        const text = sel.toString().trim();
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Walk up from the selection to find the BlockNote block element
        let node: HTMLElement | null = range.startContainer instanceof HTMLElement
          ? range.startContainer
          : range.startContainer.parentElement;

        let blockId: string | null = null;
        while (node) {
          // BlockNote uses data-id on block wrapper elements
          if (node.getAttribute?.("data-id")) {
            blockId = node.getAttribute("data-id");
            break;
          }
          // Also check data-node-type which BlockNote uses on block containers
          if (node.getAttribute?.("data-node-type") === "blockContainer") {
            blockId = node.getAttribute("data-id");
            break;
          }
          node = node.parentElement;
        }

        if (text && blockId) {
          setSelection({ text, blockId, rect });
        }
      }, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return { selection, clearSelection };
}
