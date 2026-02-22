"use client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Check, X, FileEdit } from "lucide-react";

interface SuggestedEditDiffCardProps {
  editId: string;
  noteTitle: string;
  editType: string;
  before?: any;
  after?: any;
}

export default function SuggestedEditDiffCard({
  editId,
  noteTitle,
  editType,
  before,
  after,
}: SuggestedEditDiffCardProps) {
  const accept = useMutation(api.suggestedEdits.accept);
  const reject = useMutation(api.suggestedEdits.reject);

  const handleAccept = () => accept({ editId: editId as Id<"suggestedEdits"> });
  const handleReject = () => reject({ editId: editId as Id<"suggestedEdits"> });

  const label =
    editType === "update_title"
      ? `Rename "${before?.title}" → "${after?.title}"`
      : `Edit ${editType.replace(/_/g, " ")} in "${noteTitle}"`;

  return (
    <div
      className="rounded-md overflow-hidden my-2"
      style={{ border: "1px solid var(--grove-border-2)", background: "var(--grove-surface-2)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <FileEdit size={11} style={{ color: "var(--grove-accent)" }} />
        <span
          className="text-[11px] flex-1"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          {label}
        </span>
      </div>

      {/* Diff preview */}
      {before?.title !== undefined ? (
        <div className="px-3 py-2 space-y-1">
          <div
            className="text-[10px] px-2 py-1 rounded line-through opacity-60"
            style={{ background: "rgba(255,80,80,0.06)", color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
          >
            {before.title}
          </div>
          <div
            className="text-[10px] px-2 py-1 rounded"
            style={{ background: "var(--grove-accent-dim)", color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
          >
            {after?.title}
          </div>
        </div>
      ) : after?.content ? (
        <div
          className="px-3 py-2 text-[10px] line-clamp-3"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          {after.content
            .slice(0, 3)
            .map((b: any) =>
              b.content?.map((c: any) => c.text).join("") ?? ""
            )
            .join(" · ")}
        </div>
      ) : null}

      {/* Actions */}
      <div
        className="flex gap-2 px-3 py-2"
        style={{ borderTop: "1px solid var(--grove-border)" }}
      >
        <button
          onClick={handleAccept}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-colors"
          style={{
            background: "var(--grove-accent-dim)",
            border: "1px solid var(--grove-accent-border)",
            color: "var(--grove-accent)",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)"}
        >
          <Check size={10} /> accept
        </button>
        <button
          onClick={handleReject}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-colors"
          style={{
            background: "rgba(255,80,80,0.06)",
            border: "1px solid rgba(255,80,80,0.15)",
            color: "rgba(255,120,120,0.8)",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.12)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.06)"}
        >
          <X size={10} /> reject
        </button>
      </div>
    </div>
  );
}
