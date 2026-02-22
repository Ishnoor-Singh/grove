"use client";
import Sidebar from "@/components/layout/Sidebar";
import LoreSessionList from "./LoreSessionList";
import LoreChat from "./LoreChat";

interface LoreShellProps {
  sessionId: string;
}

export default function LoreShell({ sessionId }: LoreShellProps) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--grove-bg)" }}
    >
      {/* Left: Grove sidebar (notes list + nav toggle) */}
      <Sidebar />

      {/* Center-left: Lore session list (desktop only) */}
      <div
        className="hidden md:flex w-52 shrink-0 flex-col h-screen"
        style={{
          background: "var(--grove-bg)",
          borderRight: "1px solid var(--grove-border)",
        }}
      >
        <LoreSessionList currentSessionId={sessionId} />
      </div>

      {/* Center: Chat */}
      <main
        className="flex-1 flex flex-col h-screen min-w-0"
        style={{ background: "var(--grove-surface)" }}
      >
        <LoreChat sessionId={sessionId} />
      </main>
    </div>
  );
}
