"use client";
import LoreShell from "@/components/lore/LoreShell";

export default function LoreWorkspace({ sessionId }: { sessionId: string }) {
  return <LoreShell sessionId={sessionId} />;
}
