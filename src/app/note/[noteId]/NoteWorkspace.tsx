"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import DynamicEditor from "@/components/editor/DynamicEditor";

export default function NoteWorkspace({ noteId }: { noteId: string }) {
  const [showAISidebar, setShowAISidebar] = useState(false);

  useEffect(() => {
    localStorage.setItem("grove:lastNote", noteId);
  }, [noteId]);

  return (
    <AppShell
      noteId={noteId}
      showAISidebar={showAISidebar}
      onToggleAISidebar={() => setShowAISidebar((s) => !s)}
    >
      <DynamicEditor key={noteId} noteId={noteId} />
    </AppShell>
  );
}
