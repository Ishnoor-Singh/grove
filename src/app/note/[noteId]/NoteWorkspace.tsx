"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DynamicEditor from "@/components/editor/DynamicEditor";

export default function NoteWorkspace({ noteId }: { noteId: string }) {
  const [showAISidebar, setShowAISidebar] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const showLore = searchParams.get("lore") === "1";

  useEffect(() => {
    localStorage.setItem("grove:lastNote", noteId);
  }, [noteId]);

  const toggleLore = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showLore) params.delete("lore");
    else params.set("lore", "1");
    const paramStr = params.toString();
    router.replace(`/note/${noteId}${paramStr ? `?${paramStr}` : ""}`);
  };

  return (
    <AppShell
      noteId={noteId}
      showAISidebar={showAISidebar}
      onToggleAISidebar={() => setShowAISidebar((s) => !s)}
      showLore={showLore}
      onToggleLore={toggleLore}
    >
      <DynamicEditor key={noteId} noteId={noteId} />
    </AppShell>
  );
}
