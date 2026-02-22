"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileText, Plus } from "lucide-react";

export default function Home() {
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);
  const router = useRouter();

  // If notes exist, redirect to the most recent one
  useEffect(() => {
    if (notes && notes.length > 0) {
      router.push(`/note/${notes[0]._id}`);
    }
  }, [notes, router]);

  const handleCreateNote = async () => {
    const newId = await createNote();
    router.push(`/note/${newId}`);
  };

  // Loading state
  if (notes === undefined) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--grove-bg)" }}
      >
        <div
          className="text-xs animate-pulse tracking-[0.2em] uppercase"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          Loading...
        </div>
      </div>
    );
  }

  // Redirecting state (notes exist)
  if (notes.length > 0) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--grove-bg)" }}
      >
        <div
          className="text-xs animate-pulse tracking-[0.2em] uppercase"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          Opening notes...
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "var(--grove-bg)" }}
    >
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logomark */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "var(--grove-surface-2)",
            border: "1px solid var(--grove-border-2)",
            boxShadow: "0 0 32px rgba(137,180,255,0.06)",
          }}
        >
          <FileText size={28} style={{ color: "var(--grove-accent)" }} />
        </div>

        <div className="space-y-3">
          <h1
            className="font-display italic"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              color: "var(--grove-text)",
            }}
          >
            Grove
          </h1>
          <p
            className="text-xs max-w-xs leading-relaxed"
            style={{
              color: "var(--grove-text-3)",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            Your personal knowledge ecosystem.
            <br />
            Think, write, connect.
          </p>
        </div>

        <button
          onClick={handleCreateNote}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-medium tracking-[0.08em] transition-all duration-200"
          style={{
            background: "var(--grove-accent-dim)",
            border: "1px solid var(--grove-accent-border)",
            color: "var(--grove-accent)",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(137,180,255,0.12)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <Plus size={14} />
          Create first note
        </button>
      </div>
    </div>
  );
}
