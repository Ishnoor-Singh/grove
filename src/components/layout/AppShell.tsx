"use client";

import Sidebar from "./Sidebar";
import AISidebar from "../ai/AISidebar";
import { Sparkles } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  noteId: string;
  showAISidebar: boolean;
  onToggleAISidebar: () => void;
}

export default function AppShell({
  children,
  noteId,
  showAISidebar,
  onToggleAISidebar,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--grove-bg)" }}>
      <Sidebar />

      {/* Center: editor area */}
      <main className="flex-1 overflow-y-auto relative" style={{ background: "var(--grove-surface)" }}>
        {children}

        {/* AI toggle — top right of editor */}
        <button
          onClick={onToggleAISidebar}
          className="fixed top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: showAISidebar ? "var(--grove-accent-dim)" : "var(--grove-surface-2)",
            color: showAISidebar ? "var(--grove-accent)" : "var(--grove-text-2)",
            border: showAISidebar
              ? "1px solid var(--grove-accent-border)"
              : "1px solid var(--grove-border)",
            fontFamily: "var(--font-geist-mono)",
            letterSpacing: "0.05em",
          }}
        >
          <Sparkles size={12} />
          AI
        </button>
      </main>

      {/* Right: AI sidebar */}
      {showAISidebar && (
        <aside
          className="w-[300px] h-screen shrink-0 flex flex-col"
          style={{
            background: "var(--grove-bg)",
            borderLeft: "1px solid var(--grove-border)",
          }}
        >
          <AISidebar noteId={noteId} />
        </aside>
      )}
    </div>
  );
}
