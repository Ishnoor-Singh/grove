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
    <div className="flex h-screen">
      {/* Left: Sidebar */}
      <Sidebar />

      {/* Center: Editor area */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
        {/* Toggle buttons fixed to top-right of editor */}
        <div className="fixed top-4 right-4 z-30 flex gap-2">
          <button
            onClick={onToggleAISidebar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showAISidebar
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Sparkles size={14} />
            AI
          </button>
        </div>
      </main>

      {/* Right: AI Sidebar */}
      {showAISidebar && (
        <aside className="w-80 border-l border-sidebar-border bg-white h-screen shrink-0 flex flex-col">
          <AISidebar noteId={noteId} />
        </aside>
      )}
    </div>
  );
}
