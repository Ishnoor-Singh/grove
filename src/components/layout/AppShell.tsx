"use client";

import { useEffect } from "react";
import Sidebar from "./Sidebar";
import AISidebar from "../ai/AISidebar";
import LoreDrawer from "../lore/LoreDrawer";
import { Sparkles } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  noteId: string;
  showAISidebar: boolean;
  onToggleAISidebar: () => void;
  showLore?: boolean;
  onToggleLore?: () => void;
}

export default function AppShell({
  children,
  noteId,
  showAISidebar,
  onToggleAISidebar,
  showLore,
  onToggleLore,
}: AppShellProps) {
  useEffect(() => {
    if (!showLore) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleLore?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showLore, onToggleLore]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--grove-bg)" }}>
      <Sidebar />

      {/* Center: editor area */}
      <main className="flex-1 overflow-y-auto relative" style={{ background: "var(--grove-surface)" }}>
        {children}

        {/* Toolbar — top right of editor */}
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
          {onToggleLore && (
            <button
              onClick={onToggleLore}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md transition-colors"
              style={{
                background: showLore ? "var(--grove-accent-dim)" : "var(--grove-surface-2)",
                border: `1px solid ${showLore ? "var(--grove-accent-border)" : "var(--grove-border)"}`,
                color: showLore ? "var(--grove-accent)" : "var(--grove-text-3)",
                fontFamily: "var(--font-geist-mono)",
              }}
            >
              <Sparkles size={10} /> Lore
            </button>
          )}

          <button
            onClick={onToggleAISidebar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
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
        </div>
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

      {/* Lore floating drawer */}
      {showLore && onToggleLore && (
        <div
          className="fixed top-0 right-0 h-screen w-[400px] z-40 flex flex-col"
          style={{
            background: "var(--grove-bg)",
            borderLeft: "1px solid var(--grove-border)",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
          }}
        >
          <LoreDrawer onClose={onToggleLore} />
        </div>
      )}
    </div>
  );
}
